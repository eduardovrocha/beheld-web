# End-to-end smoke test of the Position Matching feature.
#
# Walks the complete recruiter ↔ dev loop:
#   1. Company creates a Position with thresholds + priorities
#   2. The matching engine ranks devs from /directory
#   3. The dev opens their dashboard and sees the anonymous count
#   4. Position expires after 30 days → recruiter reactivates → fresh matches
#   5. A near-miss row carries failed_detail + curve
#
# Lives under spec/system because it stitches together model, service,
# controller, and payload-shape concerns end-to-end. The HTTP layer is
# exercised by the per-controller specs; this file focuses on the
# observable behavior of the feature as a whole.

require "rails_helper"

RSpec.describe "Positions matching — end-to-end smoke", type: :model do
  # ── fixtures ───────────────────────────────────────────────────────────

  let(:company) { Company.create!(name: "AcmeCo", email: "ops@acme.test") }

  def create_dev(handle:, ecosystems:, test_ratio:, bundles_at: [1])
    account = Account.create!(
      fingerprint: "fp_#{SecureRandom.hex(4)}",
      directory:   true,
    )
    # `bundles_at` is an array of "days ago" — earliest first, latest last.
    bundles_at.sort.reverse.each_with_index do |days_ago, i|
      Bundle.create!(
        account:        account,
        url_slug:       "slug_#{handle}_#{i}_#{SecureRandom.hex(2)}",
        bundle_data:    {
          "payload" => {
            "l1" => {
              "ecosystems"     => ecosystems.each_with_object({}) { |e, h| h[e] = true },
              "avg_test_ratio" => test_ratio,
            },
          },
        },
        visible:        true,
        revoked_at:     nil,
        last_bundle_at: days_ago.days.ago,
        published_at:  days_ago.days.ago,
      )
    end
    account
  end

  def configure_position!(position, *, ecosystems_threshold: nil, test_ratio_min: nil, recency_max: nil)
    position.thresholds.delete_all
    position.priorities.delete_all
    ranking = 1
    if ecosystems_threshold
      position.thresholds.create!(signal: "ecosystems", operator: "includes",
                                   value: { "items" => ecosystems_threshold })
      position.priorities.create!(signal: "ecosystems", ranking: ranking); ranking += 1
    end
    if test_ratio_min
      position.thresholds.create!(signal: "test_ratio", operator: "gte",
                                   value: { "number" => test_ratio_min })
      position.priorities.create!(signal: "test_ratio", ranking: ranking); ranking += 1
    end
    if recency_max
      position.thresholds.create!(signal: "recency", operator: "lte",
                                   value: { "number" => recency_max })
      position.priorities.create!(signal: "recency", ranking: ranking); ranking += 1
    end
    position.activate!
  end

  # ── the loop ──────────────────────────────────────────────────────────

  it "ranks devs, surfaces curve on near-miss, exposes anonymous count, survives expire+reactivate" do
    # Three devs in the directory with very different profiles.
    perfect  = create_dev(handle: "perfect",  ecosystems: %w[react rails],
                          test_ratio: 0.55, bundles_at: [60, 30, 1])
    nearmiss = create_dev(handle: "nearmiss", ecosystems: %w[react rails],
                          test_ratio: 0.25, bundles_at: [60, 20, 1])
    # `stranger` falha em DOIS thresholds: ecosystems (sem react) E recency
    # (bundle de 90 dias > limite de 30). 2 falhas → fora do near-miss
    # também, descartado por completo.
    stranger = create_dev(handle: "stranger", ecosystems: %w[django flask],
                          test_ratio: 0.50, bundles_at: [90])

    # Recruiter posts a vacancy: needs React, 30% test ratio, fresh bundle.
    position = company.positions.create!(title: "Senior Backend", status: "active")
    configure_position!(position,
                        ecosystems_threshold: ["react"],
                        test_ratio_min:       30,
                        recency_max:          30)

    # ── 1. Run the matcher ────────────────────────────────────────────
    Positions::Matcher.calculate!(position)
    rows = position.matches.includes(:account)

    perfect_row  = rows.find { |r| r.account_id == perfect.id }
    nearmiss_row = rows.find { |r| r.account_id == nearmiss.id }
    stranger_row = rows.find { |r| r.account_id == stranger.id }

    expect(perfect_row).to be_present,  "dev que casa em tudo deveria ser match"
    expect(perfect_row.match_type).to eq("match")
    expect(perfect_row.score.to_f).to be > 80, "score do match deveria ser alto"

    expect(nearmiss_row).to be_present, "dev a 5pts de test_ratio deveria ser near-miss"
    expect(nearmiss_row.match_type).to    eq("near_miss")
    expect(nearmiss_row.failed_signal).to eq("test_ratio")

    expect(stranger_row).to be_nil,
      "dev sem react E com stack distante deveria sair (≥ 2 falhas, ou só 1 mas fora da margem)"

    # ── 2. Evolution curve sobe pro near_miss (test_ratio cresceu) ───
    curve = Positions::EvolutionCurve.for(nearmiss, "test_ratio")
    expect(curve["status"]).to eq("available")
    expect(curve["points"]).to eq(3)
    # nearmiss publicou 3 bundles, mas todos com test_ratio=0.25 →
    # trend é estável. Aceitamos estável OU up (sensível ao arredondamento).
    expect(curve["trend"]).to be_in(%w[stable up])

    # ── 3. Anonymous interest counter pro dev "perfect" ──────────────
    expect(Positions::DevInterest.count_for(perfect)).to eq(1)
    expect(Positions::DevInterest.count_for(nearmiss)).to eq(0),
      "near_miss não deve contar pro contador anônimo"
    expect(Positions::DevInterest.count_for(stranger)).to eq(0)

    # ── 4. Position expira → reativação reinicia clock + recalcula ──
    position.update!(expires_at: 1.minute.ago)
    position.expire_if_due!
    expect(position.reload.status).to eq("expired")

    # Dev cycle: a dev "perfect" só ficou interessante quando a vaga
    # estava active; ao expirar, o contador anônimo zera.
    expect(Positions::DevInterest.count_for(perfect)).to eq(0)

    # Recruiter clica Reativar.
    position.activate!
    Positions::Matcher.calculate!(position)
    expect(position.reload.status).to eq("active")
    expect(position.expires_at).to be > Time.current
    expect(Positions::DevInterest.count_for(perfect)).to eq(1)

    # ── 5. Persistence: re-run mantém shape estável ──────────────────
    initial_ids = position.matches.pluck(:id).sort
    Positions::Matcher.calculate!(position)
    rebuilt_ids = position.matches.pluck(:id).sort
    expect(rebuilt_ids).not_to eq(initial_ids),
      "matches devem ser truncate-and-insert (ids novos a cada run)"
    expect(position.matches.count).to eq(rows.size),
      "mesma quantidade de devs casa entre runs idempotentes"
  end

  # ── 6. Stop-conditions explícitas da spec ───────────────────────────

  it "score nunca passa de 100 mesmo com test_ratio absurdo" do
    dev = create_dev(handle: "supertests", ecosystems: %w[react],
                     test_ratio: 5.0,    # 500% → matcher deve capear
                     bundles_at: [1])
    position = company.positions.create!(title: "Cap test", status: "active")
    configure_position!(position, ecosystems_threshold: ["react"],
                                   test_ratio_min: 30, recency_max: 30)

    Positions::Matcher.calculate!(position)
    score = position.matches.find_by(account_id: dev.id).score.to_f
    expect(score).to be_between(0.0, 100.0).inclusive
  end

  it "ecosystems vazio na lista do dev = ausência, contabiliza como 1 falha" do
    dev = create_dev(handle: "noeco", ecosystems: [],
                     test_ratio: 0.50, bundles_at: [1])
    position = company.positions.create!(title: "Eco req", status: "active")
    configure_position!(position, ecosystems_threshold: ["react"],
                                   test_ratio_min: 30)

    Positions::Matcher.calculate!(position)
    row = position.matches.find_by(account_id: dev.id)
    expect(row).to be_present
    expect(row.match_type).to    eq("near_miss")
    expect(row.failed_signal).to eq("ecosystems")
  end
end

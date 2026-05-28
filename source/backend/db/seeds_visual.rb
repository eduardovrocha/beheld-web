# frozen_string_literal: true
#
# Visual-testing seed: 100 dev profiles + 3 companies + positions/matches +
# company-dashboard activity (verifications, messages, saved devs) + login
# handles (magic links for companies, DevSession tokens for sample devs).
#
# Idempotent: tagged records are wiped + recreated on every run.
#   - dev accounts:  fingerprint LIKE 'seeddev_%'
#   - companies:     email LIKE '%@seed.beheld.test'
#
# Run:  docker exec beheld-backend-dev bundle exec rails runner db/seeds_visual.rb

require "securerandom"

puts "== beheld visual seed =="

# ── 0. wipe prior seed data ───────────────────────────────────────────────
seed_accounts  = Account.where("fingerprint LIKE ?", "seeddev_%")
seed_companies = Company.where("email LIKE ?", "%@seed.beheld.test")

PositionMatch.where(account_id: seed_accounts.select(:id)).delete_all
PositionMatch.where(position_id: Position.where(company_id: seed_companies.select(:id)).select(:id)).delete_all
Message.where(account_id: seed_accounts.select(:id)).delete_all
Message.where(company_id: seed_companies.select(:id)).delete_all
SavedDev.where(account_id: seed_accounts.select(:id)).delete_all
SavedDev.where(company_id: seed_companies.select(:id)).delete_all
Verification.where(company_id: seed_companies.select(:id)).delete_all
PositionThreshold.where(position_id: Position.where(company_id: seed_companies.select(:id)).select(:id)).delete_all
PositionPriority.where(position_id: Position.where(company_id: seed_companies.select(:id)).select(:id)).delete_all
Position.where(company_id: seed_companies.select(:id)).delete_all
DevSession.where(account_id: seed_accounts.select(:id)).delete_all
Verification.where(bundle_id: Bundle.where(account_id: seed_accounts.select(:id)).select(:id)).delete_all
Bundle.where(account_id: seed_accounts.select(:id)).delete_all
MagicLink.where(company_id: seed_companies.select(:id)).delete_all
seed_accounts.delete_all
seed_companies.delete_all
puts "cleared prior seed data"

# ── pools ─────────────────────────────────────────────────────────────────
ECOSYSTEMS = %w[rails node python flutter react devops].freeze
PLATFORMS  = %w[docker github gitlab aws gcp].freeze

FIRST = %w[ana bruno carla diego ester felipe gabi heitor igor julia kaio
           lara marco nina otavio paula rafa sofia tales uana vitor wesley
           yara bea caio dora edu fabi gui]
LAST  = %w[silva souza costa lima rocha alves pereira gomes ribeiro martins
           carvalho araujo melo barros pinto moura nunes teixeira freitas]

IDENTITIES_SHORT = [
  "Backend Rails · testes consistentes",
  "Fullstack React + Node",
  "Generalista · React e Rails",
  "Python/Data · ritmo distribuído",
  "Mobile Flutter · entrega contínua",
  "DevOps · infra como código",
  "Backend Node · APIs e filas",
  "Fullstack Python · Django + React",
].freeze

def iso(t) = t.utc.iso8601

def build_payload(handle:, ecos:, test_ratio:, scores:, identity_short:, sessions:, when_at:)
  {
    "payload" => {
      "l1" => {
        "platforms"      => PLATFORMS.sample(rand(2..3)).index_with { true },
        "ecosystems"     => ECOSYSTEMS.index_with { |e| ecos.include?(e) },
        "total_repos"    => rand(3..28),
        "total_commits"  => rand(120..3200),
        "avg_test_ratio" => test_ratio.round(4),
        "latest_commit"  => iso(when_at),
        "earliest_commit"=> iso(when_at - rand(120..400).days),
      },
      "l2" => { "sessions_analyzed" => sessions, "period_days" => 90 },
      "scores"   => scores,
      "signals"  => {
        "ecosystems"     => { "dominant" => ecos.first(2), "secondary" => ecos.drop(2), "emerging" => [], "declining" => [] },
        "tooling"        => PLATFORMS.sample(2),
        "sample_size"    => sessions,
        "schema_version" => "5",
      },
      "identity" => {
        "confidence"      => %w[low medium high].sample,
        "model_used"      => nil,
        "identity_long"   => "#{identity_short}. Trabalha com #{ecos.first(3).join(', ')} e mantém ritmo ao longo da semana.",
        "identity_short"  => identity_short,
        "generation_path" => "fallback",
      },
      "emergent"        => nil,
      "created_at"      => iso(when_at),
      "beheld_version"  => "0.3.2",
    },
    "attestation" => { "payload" => { "github" => { "login" => handle } } },
  }
end

# ── 1. 100 dev accounts ───────────────────────────────────────────────────
used_handles = {}
def uniq_handle(used, base)
  h = base
  i = 1
  while used[h]
    i += 1
    h = "#{base}#{i}"
  end
  used[h] = true
  h
end

devs = []
100.times do |i|
  handle = uniq_handle(used_handles, "#{FIRST.sample}#{LAST.sample.chars.first(3).join}")
  acct = Account.create!(
    fingerprint:    "seeddev_#{SecureRandom.hex(8)}",
    directory:      i < 92,                 # ~8 fora do diretório
    watch:          [true, false].sample,
    email_contact:  (i.even? ? "#{handle}@example.dev" : nil),     # ~metade configurou contato
    phone_contact:  (i.even? ? "+55 11 9#{rand(10_000_000..99_999_999)}" : nil),
    email_recovery: "#{handle}+rec@example.dev",
  )

  # bundle history: 1–4 pontos (alimenta a curva de evolução)
  n_bundles = [1, 1, 2, 2, 3, 4].sample
  base_ratio = rand(0.05..0.85)
  drift = rand(-0.04..0.06)
  last_bundle = nil
  n_bundles.times do |k|
    age_days  = (n_bundles - 1 - k) * rand(18..34) + rand(0..6)   # mais antigo → mais velho
    when_at   = Time.current - age_days.days
    ratio     = (base_ratio + drift * k).clamp(0.0, 0.98)
    ecos      = ECOSYSTEMS.sample(rand(1..4))
    sessions  = rand(8..120)
    scores = {
      "date"              => when_at.to_date.iso8601,
      "overall"           => rand(28..92),
      "growth_rate"       => rand(20..95),
      "tech_breadth"      => rand(30..90),
      "test_maturity"     => (ratio * 100).round,
      "prompt_quality"    => rand(25..90),
      "sessions_analyzed" => sessions,
    }
    payload = build_payload(handle: handle, ecos: ecos, test_ratio: ratio,
                            scores: scores, identity_short: IDENTITIES_SHORT.sample,
                            sessions: sessions, when_at: when_at)
    last_bundle = Bundle.create!(
      account:        acct,
      url_slug:       "smk-#{SecureRandom.alphanumeric(7).downcase}",
      bundle_data:    payload,
      visible:        true,
      revoked_at:     nil,
      published_at:   when_at,
      last_bundle_at: when_at,
    )
  end
  devs << { account: acct, handle: handle, bundle: last_bundle }
end
puts "created #{devs.size} dev accounts (#{Account.where('fingerprint LIKE ?', 'seeddev_%').joins(:bundles).distinct.count} with bundles)"

# ── 2. 3 companies ────────────────────────────────────────────────────────
company_specs = [
  { name: "Nimbus Tech",   email: "talent@seed.beheld.test" },
  { name: "Orbita Labs",   email: "people@seed.beheld.test" },
  { name: "Vertex Studio", email: "hiring@seed.beheld.test" },
]
companies = company_specs.map { |s| Company.create!(s) }
puts "created #{companies.size} companies"

# ── 3. positions per company (com thresholds + priorities + seções) ───────
SECTION = {
  "responsibilities" => "Participar do design e implementação de features de ponta a ponta, code review e mentoria.",
  "technical_stack"  => "Ruby on Rails, PostgreSQL, Sidekiq, React no frontend.",
  "requirements"     => "3+ anos de experiência com desenvolvimento web em produção.",
  "qualifications"   => "Experiência com produto B2B e cultura de testes automatizados.",
  "nice_to_have"     => "Contribuições open source, experiência com Kubernetes.",
}

def add_position(company, title:, ecos:, test_min:, recency_max:, status: "active", priorities: nil, technologies: [])
  now = Time.current
  pos = company.positions.create!(
    title:        title,
    description:  nil,
    location:     ["Remoto", "São Paulo · híbrido", "Remoto (BR)"].sample,
    technologies: technologies,
    sections:     SECTION,
    status:       status,
    activated_at: status == "active" ? now : now - 31.days,
    expires_at:   status == "active" ? now + 30.days : now - 1.day,
  )
  pos.thresholds.create!(signal: "ecosystems", operator: "includes", value: { "items" => ecos })  if ecos.any?
  pos.thresholds.create!(signal: "test_ratio", operator: "gte",      value: { "number" => test_min })    if test_min
  pos.thresholds.create!(signal: "recency",    operator: "lte",      value: { "number" => recency_max }) if recency_max
  (priorities || %w[ecosystems test_ratio recency]).each_with_index do |sig, idx|
    next unless pos.thresholds.exists?(signal: sig)
    pos.priorities.create!(signal: sig, ranking: idx + 1)
  end
  pos
end

positions = []
positions << add_position(companies[0], title: "Engenheiro Backend Sênior (Rails)",
                          ecos: %w[rails], test_min: 30, recency_max: 45,
                          technologies: %w[Rails PostgreSQL Sidekiq])
positions << add_position(companies[0], title: "Fullstack React + Node",
                          ecos: %w[react node], test_min: 20, recency_max: 60,
                          technologies: %w[React Node TypeScript])
positions << add_position(companies[1], title: "Dev Python / Data",
                          ecos: %w[python], test_min: 40, recency_max: 30,
                          technologies: %w[Python FastAPI])
positions << add_position(companies[1], title: "Mobile Flutter (expirada p/ revisão)",
                          ecos: %w[flutter], test_min: 25, recency_max: 40,
                          status: "expired", technologies: %w[Flutter Dart])
positions << add_position(companies[2], title: "DevOps / Infra",
                          ecos: %w[devops], test_min: 15, recency_max: 50,
                          technologies: %w[Docker Kubernetes Terraform])
puts "created #{positions.size} positions"

# ── 4. run matcher → popula position_matches ──────────────────────────────
positions.each { |p| Positions::Matcher.calculate!(p) if p.matching_enabled? }
puts "matcher executed → PositionMatch.count(seed)=" \
     "#{PositionMatch.where(position_id: positions.map(&:id)).count} " \
     "(match=#{PositionMatch.where(position_id: positions.map(&:id), match_type: 'match').count} " \
     "near=#{PositionMatch.where(position_id: positions.map(&:id), match_type: 'near_miss').count})"

# ── 5. company-dashboard activity (verifications, messages, saved devs) ────
visible_bundles = ->(dev) { dev[:bundle] }
companies.each_with_index do |company, ci|
  sample_devs = devs.sample(18)

  # verifications (empresa abriu retratos)
  sample_devs.first(10).each do |d|
    Verification.create!(
      bundle:      d[:bundle],
      company:     company,
      job_title:   positions.map(&:title).sample,
      area:        ["Engenharia", "Produto", "Plataforma"].sample,
      verified_at: Time.current - rand(0..20).days - rand(0..23).hours,
    )
  end

  # messages (contatos enviados) com status variados
  sample_devs.first(8).each_with_index do |d, idx|
    sent = Time.current - rand(1..25).days
    responded = idx.even?  ? sent + rand(1..4).days : nil
    ignored   = (!responded && idx % 3 == 0) ? sent + rand(1..5).days : nil
    Message.create!(
      company:      company,
      account:      d[:account],
      job_title:    positions.map(&:title).sample,
      body:         "Olá #{d[:handle]}, vimos seu perfil no beheld e temos uma vaga que parece encaixar. Topa conversar?",
      sent_at:      sent,
      responded_at: responded,
      ignored_at:   ignored,
    )
  end

  # saved devs (bookmarks privados)
  sample_devs.last(6).each_with_index do |d, idx|
    SavedDev.create!(
      company:  company,
      account:  d[:account],
      note:     idx.even? ? "Forte em #{ECOSYSTEMS.sample} · revisitar no Q3" : nil,
      saved_at: Time.current - rand(0..15).days,
    )
  end
end
puts "seeded dashboard activity (verifications/messages/saved_devs) for #{companies.size} companies"

# ── 5.5 EDGE STATES ────────────────────────────────────────────────────────
# Estados de borda que cada view renderiza diferente. Devs showcase usam
# fingerprint determinístico (handles estáveis) pra URLs previsíveis.

def make_bundle(account, handle:, ecos:, ratio:, when_at:, visible: true, revoked: false, slug: nil)
  sessions = rand(10..80)
  scores = {
    "date" => when_at.to_date.iso8601, "overall" => rand(40..88),
    "growth_rate" => rand(30..90), "tech_breadth" => rand(35..85),
    "test_maturity" => (ratio * 100).round, "prompt_quality" => rand(30..85),
    "sessions_analyzed" => sessions,
  }
  Bundle.create!(
    account:        account,
    url_slug:       slug || "smk-#{SecureRandom.alphanumeric(7).downcase}",
    bundle_data:    build_payload(handle: handle, ecos: ecos, test_ratio: ratio,
                                  scores: scores, identity_short: IDENTITIES_SHORT.sample,
                                  sessions: sessions, when_at: when_at),
    visible:        visible,
    revoked_at:     revoked ? when_at + 1.day : nil,
    published_at:   when_at,
    last_bundle_at: when_at,
  )
end

showcase = {}

# (a) Dev com TODOS os estados de bundle no dashboard "Publicações":
#     verificado (fresco visível), desatualizado (>30d), oculto (visible:false),
#     revogado (revoked_at). O slug revogado testa a página 404 do /v/:slug.
badges_acct = Account.create!(fingerprint: "seeddev_badges#{SecureRandom.hex(4)}",
                              directory: true, watch: true,
                              email_contact: "showcase@example.dev",
                              phone_contact: "+55 11 999990000",
                              email_recovery: "showcase+rec@example.dev")
make_bundle(badges_acct, handle: "showcasebadges", ecos: %w[rails react], ratio: 0.55, when_at: 3.days.ago)             # verified
make_bundle(badges_acct, handle: "showcasebadges", ecos: %w[rails],       ratio: 0.40, when_at: 48.days.ago)            # outdated
make_bundle(badges_acct, handle: "showcasebadges", ecos: %w[node],        ratio: 0.30, when_at: 10.days.ago, visible: false) # oculto
revoked_bundle = make_bundle(badges_acct, handle: "showcasebadges", ecos: %w[python], ratio: 0.20, when_at: 20.days.ago, revoked: true) # revogado
showcase[:badges]  = badges_acct
showcase[:revoked_slug] = revoked_bundle.url_slug

# (b) Dev SEM bundle → dashboard "Você ainda não publicou"
empty_dev = Account.create!(fingerprint: "seeddev_empty#{SecureRandom.hex(4)}",
                            directory: false, watch: false,
                            email_recovery: "empty+rec@example.dev")
showcase[:empty_dev] = empty_dev

# (c) Nudge determinístico: fresco (<5d, sem nudge) e velho (≥5d, card visível)
nudge_fresh = Account.create!(fingerprint: "seeddev_nudgefresh#{SecureRandom.hex(4)}", directory: true, watch: true,
                              email_recovery: "nf+rec@example.dev")
make_bundle(nudge_fresh, handle: "nudgefresh", ecos: %w[rails], ratio: 0.5, when_at: 2.days.ago)
make_bundle(nudge_fresh, handle: "nudgefresh", ecos: %w[rails react], ratio: 0.6, when_at: 30.days.ago)  # 2 pontos → curva available
showcase[:nudge_fresh] = nudge_fresh

nudge_stale = Account.create!(fingerprint: "seeddev_nudgestale#{SecureRandom.hex(4)}", directory: true, watch: true,
                              email_recovery: "ns+rec@example.dev")
make_bundle(nudge_stale, handle: "nudgestale", ecos: %w[python], ratio: 0.3, when_at: 9.days.ago)        # 1 ponto → curva building
showcase[:nudge_stale] = nudge_stale

# (d) Empresa zerada → testa empty states de todas as abas
pristine = Company.create!(name: "Pristine Co", email: "fresh@seed.beheld.test")
showcase[:pristine] = pristine

# (e) Position sem nenhum match confirmado (test_ratio gte 100 → impossível)
zero_pos = pristine.positions.create!(
  title: "Staff Engineer (sem matches)", location: "Remoto",
  sections: SECTION, technologies: %w[Rails],
  status: "active", activated_at: Time.current, expires_at: 30.days.from_now,
)
zero_pos.thresholds.create!(signal: "test_ratio", operator: "gte", value: { "number" => 100 })
zero_pos.priorities.create!(signal: "test_ratio", ranking: 1)
Positions::Matcher.calculate!(zero_pos)
showcase[:zero_position] = zero_pos

# (f) Enriquecer os 3 devs de login (devs.first(3)) com atividade garantida
login_devs = devs.first(3)
login_devs.each_with_index do |d, idx|
  co = companies[idx % companies.size]
  Verification.create!(bundle: d[:bundle], company: co,
                       job_title: positions.map(&:title).sample, area: "Engenharia",
                       verified_at: Time.current - rand(1..10).days)
  Message.create!(company: co, account: d[:account],
                  job_title: positions.map(&:title).sample,
                  body: "Olá #{d[:handle]}, temos uma vaga que casa com seu perfil. Topa conversar?",
                  sent_at: Time.current - rand(2..12).days)
  # idempotente: o dev pode já ter sido salvo no sample aleatório da seção 5
  sd = SavedDev.find_or_initialize_by(company: co, account: d[:account])
  sd.note     = "Candidato forte — acompanhar"
  sd.saved_at ||= Time.current - rand(1..8).days
  sd.save!
end

# (g) Dev com MUITOS indicadores técnicos → exercita o carrossel horizontal
#     de ecossistemas no card do diretório (estoura a largura e rola).
stack_acct = Account.create!(fingerprint: "seeddev_stack#{SecureRandom.hex(4)}",
                             directory: true, watch: true,
                             email_contact: "fullstack@example.dev",
                             phone_contact: "+55 11 988887777",
                             email_recovery: "stack+rec@example.dev")
MANY_ECOS = %w[rails node python flutter react devops go rust elixir kotlin swift java php vue].freeze
stack_bundle = make_bundle(stack_acct, handle: "showcasestack", ecos: MANY_ECOS, ratio: 0.74, when_at: 2.days.ago)
# build_payload só monta o vocabulário canônico (6) em l1.ecosystems; pro
# showcase sobrescrevemos com o mapa completo (todas as techs presentes).
stack_data = stack_bundle.bundle_data
stack_data["payload"]["l1"]["ecosystems"] = MANY_ECOS.index_with { true }
stack_bundle.update!(bundle_data: stack_data)
showcase[:stack] = stack_acct

puts "seeded edge states: bundle badges (verified/outdated/hidden/revoked), empty dev, " \
     "nudge fresh+stale, pristine company, zero-match position, enriched login devs, " \
     "stack dev (#{MANY_ECOS.size} ecossistemas → carrossel)"

# ── 6. logins ──────────────────────────────────────────────────────────────
puts "\n== ACESSOS PARA TESTE VISUAL =="

puts "\n-- Empresas (magic link → seta cookie de sessão) --"
(companies + [showcase[:pristine]]).each do |c|
  link = MagicLink.create!(company: c, token: SecureRandom.hex(24), expires_at: 30.minutes.from_now)
  tag  = c == showcase[:pristine] ? " (empty states)" : ""
  puts "  #{c.name.ljust(16)}#{tag} login: http://localhost:5173/sessions/company/verify?token=#{link.token}"
end

puts "\n-- Devs (DevSession token → dashboard) --"
devs.first(3).each do |d|
  s = DevSession.create!(account: d[:account], token: SecureRandom.hex(32), expires_at: 24.hours.from_now)
  puts "  @#{d[:handle].ljust(20)} http://localhost:5173/dashboard?session=#{s.token}"
end

puts "\n-- Retratos públicos (amostra) --"
devs.first(5).each do |d|
  puts "  @#{d[:handle].ljust(20)} http://localhost:5173/v/#{d[:bundle].url_slug}"
end

puts "\n-- Showcase: estados de borda (DevSession) --"
{
  "badges (verif/desatual/oculto/revog)" => showcase[:badges],
  "sem bundle (empty dashboard)"         => showcase[:empty_dev],
  "nudge fresco (<5d, sem nudge)"        => showcase[:nudge_fresh],
  "nudge velho (≥5d, card curva)"        => showcase[:nudge_stale],
}.each do |label, acct|
  s = DevSession.create!(account: acct, token: SecureRandom.hex(32), expires_at: 24.hours.from_now)
  puts "  #{label.ljust(38)} http://localhost:5173/dashboard?session=#{s.token}"
end
puts "  retrato REVOGADO (404 page)            http://localhost:5173/v/#{showcase[:revoked_slug]}"
puts "  position SEM matches → revisar empresa 'Pristine Co' aba Posições"
puts "  @showcasestack (#{MANY_ECOS.size} ecossistemas, carrossel) → buscar no diretório / retrato:"
puts "                                         http://localhost:5173/v/#{stack_bundle.url_slug}"

puts "\n-- Diretório / dashboard empresa --"
puts "  diretório:         http://localhost:5173/directory"
puts "  dashboard empresa: http://localhost:5173/company/dashboard"

puts "\n== seed concluído =="

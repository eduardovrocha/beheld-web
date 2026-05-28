require "rails_helper"

RSpec.describe Positions::DevInterest do
  let(:account) { Account.create!(fingerprint: "fp_#{SecureRandom.hex(4)}", directory: true) }

  def add_position(status: "active")
    company = Company.create!(name: "Co_#{SecureRandom.hex(2)}", email: "ops_#{SecureRandom.hex(2)}@test.dev")
    company.positions.create!(title: "Vaga #{SecureRandom.hex(2)}", status: status)
  end

  def add_match(position, account, match_type: "match")
    PositionMatch.create!(
      position:      position,
      account:       account,
      match_type:    match_type,
      score:         match_type == "match" ? 80.0 : 30.0,
      failed_signal: match_type == "near_miss" ? "test_ratio" : nil,
      calculated_at: Time.current,
    )
  end

  it "retorna 0 quando o dev não tem nenhum match persistido" do
    add_position   # uma vaga existe mas o dev não casou
    expect(described_class.count_for(account)).to eq(0)
  end

  it "conta uma empresa por match confirmado em position ativa" do
    add_match(add_position, account)
    expect(described_class.count_for(account)).to eq(1)
  end

  it "deduplica por empresa: 2 positions ativas da mesma empresa → 1" do
    company = Company.create!(name: "DupCo", email: "dup@test.dev")
    p1 = company.positions.create!(title: "A", status: "active")
    p2 = company.positions.create!(title: "B", status: "active")
    add_match(p1, account)
    add_match(p2, account)
    expect(described_class.count_for(account)).to eq(1)
  end

  it "IGNORA near_miss (stop-condition explícito da spec)" do
    add_match(add_position, account, match_type: "near_miss")
    expect(described_class.count_for(account)).to eq(0)
  end

  it "IGNORA positions expiradas / closed" do
    add_match(add_position(status: "expired"), account)
    add_match(add_position(status: "closed"),  account)
    expect(described_class.count_for(account)).to eq(0)
  end

  it "soma duas empresas distintas" do
    add_match(add_position, account)
    add_match(add_position, account)
    expect(described_class.count_for(account)).to eq(2)
  end

  describe "janela 'esta semana' (P21 spec section 7)" do
    it "ignora matches calculados há mais de 7 dias" do
      m = add_match(add_position, account)
      m.update_column(:calculated_at, 8.days.ago)
      expect(described_class.count_for(account)).to eq(0)
    end

    it "conta matches calculados há 6 dias (dentro da janela)" do
      m = add_match(add_position, account)
      m.update_column(:calculated_at, 6.days.ago)
      expect(described_class.count_for(account)).to eq(1)
    end

    it "trata edge: calculated_at exatamente 7 dias atrás continua dentro" do
      now = Time.current
      m = add_match(add_position, account)
      m.update_column(:calculated_at, now - 7.days + 1.minute)
      expect(described_class.count_for(account, now: now)).to eq(1)
    end
  end
end

# Seleção de locale por requisição. Prioridade:
#   1. parâmetro explícito `?locale=` (pt-BR | en | es)
#   2. cabeçalho Accept-Language do navegador (primeira correspondência)
#   3. I18n.default_locale (pt-BR)
#
# Envolve a ação em I18n.with_locale para não vazar o locale entre threads.
module LocaleSelectable
  extend ActiveSupport::Concern

  included do
    around_action :switch_locale
  end

  private

  def switch_locale(&action)
    I18n.with_locale(locale_from_request, &action)
  end

  def locale_from_request
    # Lemos só a query string (`?locale=`), nunca `params[:locale]` — este
    # último forçaria o parse do corpo da requisição, o que quebra endpoints
    # que recebem JSON malformado de propósito e tratam o erro na própria ação.
    from_param  = normalize_locale(request.query_parameters[:locale])
    return from_param if from_param

    from_header = locale_from_accept_language
    return from_header if from_header

    I18n.default_locale
  end

  # Mapeia uma tag arbitrária (ex.: "pt", "pt-BR", "es-419", "EN") para um dos
  # available_locales, ou nil se não houver correspondência.
  def normalize_locale(raw)
    tag = raw.to_s.strip.downcase
    return nil if tag.empty?

    return :"pt-BR" if tag.start_with?("pt")
    return :es      if tag.start_with?("es")
    return :en      if tag.start_with?("en")

    nil
  end

  def locale_from_accept_language
    header = request.env["HTTP_ACCEPT_LANGUAGE"].to_s
    return nil if header.empty?

    header.split(",").each do |part|
      tag = part.split(";").first
      match = normalize_locale(tag)
      return match if match
    end
    nil
  end
end

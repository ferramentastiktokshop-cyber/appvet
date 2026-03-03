const SYSTEM_PROMPT = `Você é o Mestre de Conteúdo em Fisiatria Veterinária — um produtor de conteúdo digital de elite, especializado em Fisioterapia Veterinária (Fisiatria).

Seu objetivo é gerar roteiros de conteúdo para vídeos curtos (Reels/TikTok) usando o Framework H.E.R.A., extraído da análise de 27 conteúdos validados pelo mercado.

## FRAMEWORK H.E.R.A.

Todo conteúdo DEVE seguir esta estrutura:

### H — HOOK (primeiros 3 segundos)
- Use uma pergunta-espelho que transforma um comportamento cotidiano do tutor em potencial ameaça
- Fórmulas: "Você [ação comum]? Então cuidado!", "Seu cão [sintoma]? Presta atenção", "Você sabia que [fato surpreendente]?"
- O tutor PRECISA se reconhecer na situação

### E — ESCALA (desenvolvimento)
- Bloco 1 — Problema amplificado: Explique o mecanismo fisiológico de forma simplificada com analogias visuais
- Bloco 2 — Consequência emocional: Escale para o pior cenário (paralisia, dor crônica, etc.)
- Use a ponte: [comportamento simples] → [mecanismo técnico acessível] → [consequência assustadora]

### R — RESOLUÇÃO (solução prática)
- Ofereça uma ação simples e imediata que o tutor pode fazer HOJE, em casa, sem custo
- Deve gerar sensação de controle e gratidão

### A — AÇÃO (CTA)
- Rotacione entre 3 tipos:
  - Engajamento: "Me conta aqui como você faz..."
  - Compartilhamento: "Manda pra aquele amigo que tem cachorro"
  - Conversão: "Comenta [palavra] que eu mando no direct"

## TOM DE VOZ
- Empático-professoral: professora acolhedora que se preocupa com o "filho" do tutor
- Diminutivos para partes do corpo do animal (patinha, coluninha, barriguinha)
- Termos técnicos SEMPRE seguidos de tradução simples
- "Seu cão" > "o animal". "Pais e mães de dogs" como tratamento coletivo
- Frases curtas e diretas. Perguntas retóricas. Comandos gentis.
- Calibragem por bloco: Hook=alerta, Escala=educativo-grave, Resolução=acolhedor, CTA=conversacional

## GATILHOS MENTAIS OBRIGATÓRIOS
- Medo/Aversão à perda (motor principal)
- Autoridade (mencionar especialização)
- Curiosidade/Loop aberto
- Reciprocidade (dica gratuita valiosa)

## REGRAS
- Conteúdo 100% original
- Informações veterinárias precisas e responsáveis
- Sempre sugerir consultar o veterinário quando relevante
- Incluir sugestões de B-roll e elementos visuais entre colchetes [...]
- Formato: roteiro falado, natural, como se estivesse conversando com o tutor

## FORMATO DE SAÍDA
Para cada tema, gere o roteiro completo com as seções claramente marcadas: HOOK, ESCALA, RESOLUÇÃO, CTA. Inclua também:
- Sugestões de texto na tela / legendas dinâmicas
- Sugestões de B-roll ou demonstração visual
- Hashtags sugeridas (5-8)
- Duração estimada do vídeo

Responda SEMPRE em português brasileiro.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  try {
    const { tema, categoria } = req.body;

    if (!tema || !tema.trim()) {
      return res.status(400).json({ error: 'Tema é obrigatório.' });
    }

    const userMsg = `Gere um roteiro completo para um vídeo curto (Reels/TikTok) sobre o seguinte tema de fisiatria veterinária:

**Tema:** ${tema.trim()}
${categoria ? `**Categoria:** ${categoria}` : ""}

Siga rigorosamente o Framework H.E.R.A. e inclua todas as seções: HOOK, ESCALA, RESOLUÇÃO, CTA (AÇÃO), sugestões de B-roll/legendas, hashtags e duração estimada.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userMsg }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.9,
          }
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(500).json({ error: data.error.message || 'Erro na API do Gemini.' });
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "";

    if (!text) {
      return res.status(500).json({ error: 'Resposta vazia do Gemini.' });
    }

    return res.status(200).json({ text });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

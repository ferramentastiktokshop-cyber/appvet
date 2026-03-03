import { useState, useRef, useEffect } from "react";

const CATEGORIES = [
  { id: "erro", label: "Erro Cotidiano", emoji: "⚠️", desc: "Hábitos comuns que prejudicam" },
  { id: "sinal", label: "Sinais Ocultos", emoji: "🔍", desc: "Sintomas que o tutor ignora" },
  { id: "saber", label: "Conhecimento", emoji: "🧠", desc: "Informação que todo tutor precisa" },
  { id: "fazer", label: "Ação Prática", emoji: "🛠️", desc: "Dicas aplicáveis em casa" },
];

const EXAMPLES = {
  erro: ["Cão que puxa a guia no passeio", "Brincar de frisbee com cão idoso", "Deixar o cão pular da caminhonete"],
  sinal: ["Cão que anda em círculos", "Cão que evita deitar de um lado", "Cão que range os dentes dormindo"],
  saber: ["Como o frio afeta as articulações", "Diferença entre artrite e artrose canina", "Suplementos articulares: funcionam?"],
  fazer: ["Exercícios de equilíbrio em casa", "Como fazer compressa quente corretamente", "Hidroterapia caseira na banheira"],
};

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#c49a6c",
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

function parseContent(text) {
  const sections = [];
  const patterns = [
    { key: "hook", regex: /\*?\*?(?:#{1,3}\s*)?(?:🎣\s*)?H(?:\s*[—–-]\s*|\s*:\s*)HOOK.*?\*?\*?\n([\s\S]*?)(?=\*?\*?(?:#{1,3}\s*)?(?:📈\s*)?E(?:\s*[—–-]\s*|\s*:\s*)ESCALA|$)/i },
    { key: "escala", regex: /\*?\*?(?:#{1,3}\s*)?(?:📈\s*)?E(?:\s*[—–-]\s*|\s*:\s*)ESCALA.*?\*?\*?\n([\s\S]*?)(?=\*?\*?(?:#{1,3}\s*)?(?:✅\s*)?R(?:\s*[—–-]\s*|\s*:\s*)RESOLU[ÇC][ÃA]O|$)/i },
    { key: "resolucao", regex: /\*?\*?(?:#{1,3}\s*)?(?:✅\s*)?R(?:\s*[—–-]\s*|\s*:\s*)RESOLU[ÇC][ÃA]O.*?\*?\*?\n([\s\S]*?)(?=\*?\*?(?:#{1,3}\s*)?(?:📣\s*)?A(?:\s*[—–-]\s*|\s*:\s*)(?:A[ÇC][ÃA]O|CTA)|$)/i },
    { key: "cta", regex: /\*?\*?(?:#{1,3}\s*)?(?:📣\s*)?A(?:\s*[—–-]\s*|\s*:\s*)(?:A[ÇC][ÃA]O|CTA).*?\*?\*?\n([\s\S]*?)(?=\*?\*?(?:#{1,3}\s*)?(?:📝|🎬|#|Sugest|Hashtag|Dura[çc][ãa]o)|$)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match) sections.push({ key, content: match[1].trim() });
  }

  const hashtagMatch = text.match(/(?:#{1,3}\s*)?(?:🏷️?\s*)?Hashtags?[:\s]*([\s\S]*?)(?=\n\n|#{1,3}|⏱|Dura[çc]|$)/i);
  const durationMatch = text.match(/(?:⏱️?\s*)?Dura[çc][ãa]o[:\s]*(.*)/i);

  let extras = "";
  if (hashtagMatch) extras += hashtagMatch[1].trim() + "\n";
  if (durationMatch) extras += "⏱️ " + durationMatch[1].trim();
  if (extras) sections.push({ key: "extras", content: extras.trim() });

  if (sections.length === 0) {
    sections.push({ key: "full", content: text });
  }

  return sections;
}

const sectionMeta = {
  hook: { label: "HOOK", icon: "🎣", color: "#e85d4a" },
  escala: { label: "ESCALA", icon: "📈", color: "#c49a6c" },
  resolucao: { label: "RESOLUÇÃO", icon: "✅", color: "#5aad7a" },
  cta: { label: "AÇÃO / CTA", icon: "📣", color: "#6b8fd4" },
  extras: { label: "PRODUÇÃO", icon: "🎬", color: "#8a7fb8" },
  full: { label: "ROTEIRO", icon: "📝", color: "#c49a6c" },
};

function formatText(text) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((seg, j) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={j} style={{ color: "#e8e2d8", fontWeight: 600 }}>{seg.slice(2, -2)}</strong>;
      }
      return <span key={j}>{seg}</span>;
    });
    return <div key={i} style={{ marginBottom: line === "" ? 8 : 2 }}>{formatted}</div>;
  });
}

export default function App() {
  const [tema, setTema] = useState("");
  const [categoria, setCategoria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rawText, setRawText] = useState("");
  const resultRef = useRef(null);

  const generate = async () => {
    if (!tema.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setRawText("");

    const catLabel = categoria ? CATEGORIES.find(c => c.id === categoria)?.label : "";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema: tema.trim(), categoria: catLabel }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || "Erro ao gerar conteúdo.");
      } else {
        setRawText(data.text);
        setResult(parseContent(data.text));
      }
    } catch (e) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0c0a",
      color: "#d8d2c8",
      fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(196,154,108,0.3); }
        textarea:focus, button:focus-visible { outline: 2px solid rgba(196,154,108,0.4); outline-offset: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        .section-card { animation: fadeUp 0.5s ease both; }
        .gen-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(196,154,108,0.25); }
        .gen-btn:active:not(:disabled) { transform: translateY(0); }
        .cat-btn:hover { border-color: rgba(196,154,108,0.4) !important; background: rgba(196,154,108,0.08) !important; }
        .ex-chip:hover { background: rgba(196,154,108,0.12) !important; color: #c49a6c !important; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 30% 10%, rgba(196,154,108,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 90%, rgba(90,173,122,0.03) 0%, transparent 40%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 20,
            background: "rgba(196,154,108,0.1)",
            border: "1px solid rgba(196,154,108,0.2)",
            fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
            color: "#c49a6c", marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>🐾</span> Gerador de Conteúdo
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(28px, 6vw, 44px)",
            fontWeight: 800, lineHeight: 1.1,
            margin: "0 0 14px",
            color: "#f0ebe3",
          }}>
            Fisiatria Vet<span style={{ color: "#c49a6c" }}>.</span> Content
          </h1>
          <p style={{ color: "#7a756b", fontSize: 15, margin: 0, maxWidth: 480, marginInline: "auto" }}>
            Cole o tema, escolha a categoria e receba um roteiro completo usando o Framework H.E.R.A.
          </p>
        </div>

        {/* Category selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6a655b", marginBottom: 10, display: "block" }}>
            Categoria (opcional)
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="cat-btn"
                onClick={() => setCategoria(categoria === cat.id ? null : cat.id)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${categoria === cat.id ? "rgba(196,154,108,0.5)" : "rgba(255,255,255,0.06)"}`,
                  background: categoria === cat.id ? "rgba(196,154,108,0.12)" : "rgba(255,255,255,0.02)",
                  color: categoria === cat.id ? "#c49a6c" : "#8a857b",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: categoria === cat.id ? "#d4b88a" : "#b0aa9e" }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: "#6a655b", marginTop: 2 }}>{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Examples */}
        {categoria && (
          <div style={{ marginBottom: 20, animation: "fadeUp 0.3s ease" }}>
            <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6a655b", marginBottom: 8, display: "block" }}>
              Exemplos de temas
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EXAMPLES[categoria]?.map((ex, i) => (
                <button key={i} className="ex-chip" onClick={() => setTema(ex)} style={{
                  padding: "6px 12px", borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#8a857b", fontSize: 12, cursor: "pointer",
                  transition: "all 0.2s ease",
                }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#6a655b", marginBottom: 8, display: "block" }}>
            Tema do conteúdo
          </label>
          <textarea
            value={tema}
            onChange={e => setTema(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
            placeholder="Ex: Cão que manca depois de dormir, Importância do aquecimento antes do passeio..."
            rows={3}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#e8e2d8",
              fontSize: 15,
              fontFamily: "inherit",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Generate button */}
        <button
          className="gen-btn"
          onClick={generate}
          disabled={loading || !tema.trim()}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "none",
            cursor: loading || !tema.trim() ? "not-allowed" : "pointer",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            color: loading || !tema.trim() ? "#6a655b" : "#0d0c0a",
            background: loading || !tema.trim()
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #c49a6c, #d4b88a)",
            transition: "all 0.3s ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {loading ? (
            <>Gerando roteiro <TypingDots /></>
          ) : (
            <>🎬 Gerar Roteiro H.E.R.A.</>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: "14px 18px", borderRadius: 10,
            background: "rgba(232,93,74,0.1)", border: "1px solid rgba(232,93,74,0.2)",
            color: "#e8937a", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultRef} style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f0ebe3", fontFamily: "'Playfair Display', serif" }}>
                Roteiro Gerado
              </h2>
              <button onClick={handleCopy} style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(196,154,108,0.3)",
                background: copied ? "rgba(90,173,122,0.15)" : "rgba(196,154,108,0.08)",
                color: copied ? "#5aad7a" : "#c49a6c",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s ease", fontFamily: "inherit",
              }}>
                {copied ? "✓ Copiado!" : "Copiar tudo"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.map((section, idx) => {
                const meta = sectionMeta[section.key] || sectionMeta.full;
                return (
                  <div
                    key={idx}
                    className="section-card"
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${meta.color}22`,
                      background: `${meta.color}08`,
                      overflow: "hidden",
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  >
                    <div style={{
                      padding: "10px 16px",
                      display: "flex", alignItems: "center", gap: 8,
                      borderBottom: `1px solid ${meta.color}15`,
                      background: `${meta.color}0a`,
                    }}>
                      <span style={{ fontSize: 16 }}>{meta.icon}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        letterSpacing: 1.5, textTransform: "uppercase",
                        color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{
                      padding: "14px 16px",
                      fontSize: 14,
                      lineHeight: 1.75,
                      color: "#b5b0a5",
                    }}>
                      {formatText(section.content)}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { setResult(null); setRawText(""); setTema(""); }}
              style={{
                marginTop: 24, width: "100%", padding: "14px",
                borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#8a857b", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              ✨ Gerar novo roteiro
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 48, textAlign: "center",
          padding: "16px", borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#4a4640", letterSpacing: 0.5 }}>
            Framework H.E.R.A. — Hook · Escala · Resolução · Ação
          </p>
        </div>
      </div>
    </div>
  );
}

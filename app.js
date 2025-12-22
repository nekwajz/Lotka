// Lotka story engine (2 volby, historie, restart modal)
let gameData = null;
let currentNodeId = null;
const history = [];

function byId(id){ return document.getElementById(id); }

function splitIntoSentences(text){
  // Bez lookbehind (lepší kompatibilita i se starším Safari).
  // Vytáhne věty končící ., !, ? a zachová interpunkci.
  const t = (text || "").trim();
  if (!t) return [];
  const matches = t.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return (matches || []).map(s => s.trim()).filter(Boolean);
}

function renderText(container, text){
  container.innerHTML = "";
  const sentences = splitIntoSentences(text);

  // seskupíme po 2 větách do odstavců, aby se to dobře četlo nahlas
  for (let i = 0; i < sentences.length; i += 2){
    const p = document.createElement("p");
    const chunk = sentences.slice(i, i + 2).join(" ");
    p.textContent = chunk;
    container.appendChild(p);
  }
}

function getNode(id){
  return gameData?.scenes?.[id] ?? null;
}

function renderNode(nodeId){
  const node = getNode(nodeId);
  if (!node){
    console.error("Neznámý uzel:", nodeId);
    const titleEl = byId("scene-title");
    const textEl = byId("scene-text");
    const choicesEl = byId("choices");
    if (titleEl) titleEl.textContent = "Chyba";
    if (textEl) textEl.textContent = "Nepodařilo se najít scénu. Zkontroluj game.json.";
    if (choicesEl) choicesEl.innerHTML = "";
    return;
  }

  currentNodeId = nodeId;

  byId("scene-title").textContent = node.title || "";
  renderText(byId("scene-text"), node.text || "");

  const choicesEl = byId("choices");
  choicesEl.innerHTML = "";

  if (Array.isArray(node.choices) && node.choices.length > 0){
    node.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "btn choice-btn";
      btn.type = "button";
      btn.textContent = choice.text;
      btn.onclick = () => goTo(choice.nextId);
      choicesEl.appendChild(btn);
    });
  } else {
    const info = document.createElement("div");
    info.style.marginTop = "12px";
    info.style.color = "#444";
    info.textContent = "Konec příběhu. Můžeš si o něm teď ještě povídat nebo dát restart.";
    choicesEl.appendChild(info);
  }

  updateBackButton();
  // scroll na vršek karty (hlavně na mobilu)
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goTo(nextId){
  if (!nextId) return;
  if (currentNodeId) history.push(currentNodeId);
  renderNode(nextId);
}

function updateBackButton(){
  const backBtn = byId("back-btn");
  if (!backBtn) return;
  backBtn.disabled = history.length === 0;
}

function goBack(){
  if (history.length === 0) return;
  const prevId = history.pop();
  renderNode(prevId);
}

// ===== Restart modal =====
function openRestartModal(){
  byId("restart-modal").classList.remove("hidden");
}

function closeRestartModal(){
  byId("restart-modal").classList.add("hidden");
}

function restartStory(){
  history.length = 0;
  renderNode(gameData.startId);
}

async function loadGame(){
  const res = await fetch("game.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Nepodařilo se načíst game.json");
  const data = await res.json();
  if (!data?.startId || !data?.scenes) throw new Error("game.json nemá správnou strukturu");
  return data;
}

window.addEventListener("DOMContentLoaded", async () => {
  // tlačítka
  const backBtn = byId("back-btn");
  if (backBtn) backBtn.addEventListener("click", goBack);

  const restartBtn = byId("restart-btn");
  if (restartBtn) restartBtn.addEventListener("click", openRestartModal);

  byId("restart-yes").addEventListener("click", () => {
    closeRestartModal();
    restartStory();
  });

  byId("restart-no").addEventListener("click", closeRestartModal);

  // klik na pozadí modalu = zavřít
  const modal = byId("restart-modal");
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeRestartModal();
  });

  // načti hru
  try{
    gameData = await loadGame();
    renderNode(gameData.startId);
  } catch (err){
    console.error(err);
    byId("scene-title").textContent = "Nepodařilo se načíst hru";
    byId("scene-text").textContent = "Zkontroluj, že je v repozitáři soubor game.json a GitHub Pages ho načítá.";
    byId("choices").innerHTML = "";
    updateBackButton();
  }
});

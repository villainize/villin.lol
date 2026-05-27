/* ===== DOM ===== */
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const searchResults = document.getElementById("searchResults");
const collectionGrid = document.getElementById("collectionGrid");
const collectionToggle = document.getElementById("collectionToggle");
const collectionSection = document.getElementById("collectionSection");

const deckSelect = document.getElementById("deckSelect");
const newDeckBtn = document.getElementById("newDeckBtn");
const renameDeckBtn = document.getElementById("renameDeckBtn");
const deleteDeckBtn = document.getElementById("deleteDeckBtn");
const exportDeckBtn = document.getElementById("exportDeckBtn");
const importDeckBtn = document.getElementById("importDeckBtn");
const importDeckInput = document.getElementById("importDeckInput");

const mainDeckGrid = document.getElementById("mainDeckGrid");
const sideDeckGrid = document.getElementById("sideDeckGrid");
const extraDeckGrid = document.getElementById("extraDeckGrid");

const handGrid = document.getElementById("handGrid");
const gyGrid = document.getElementById("gyGrid");
const deckCount = document.getElementById("deckCount");
const handCount = document.getElementById("handCount");
const gyCount = document.getElementById("gyCount");

/* ===== DATA ===== */
let allCards = JSON.parse(localStorage.allCards || "[]");
let decks = JSON.parse(localStorage.decks || '{"My Deck":{"main":[],"side":[],"extra":[]}}');
let activeDeck = localStorage.activeDeck || Object.keys(decks)[0];
const limits = { main: 60, side: 15, extra: 15 };
const copyLimit = 3;

/* ===== SAVE ===== */
function save() {
    localStorage.allCards = JSON.stringify(allCards);
    localStorage.decks = JSON.stringify(decks);
    localStorage.activeDeck = activeDeck;
}

/* ===== HYPERGEOMETRIC ODDS ===== */
function openingHandOdds(q, D, H = 5) {
    return q === 0 ? 0 : ((1 - Math.pow((D - q) / D, H)) * 100).toFixed(1);
}

/* ===== TEST DECK ===== */
let testDeck = [], hand = [], gy = [];

/* ===== TOOLTIP ===== */
const tooltip = document.createElement("div");
tooltip.className = "card-tooltip";
tooltip.style.position = "absolute";
tooltip.style.pointerEvents = "none";
tooltip.style.display = "none";
tooltip.style.background = "#222";
tooltip.style.color = "#fff";
tooltip.style.padding = "8px";
tooltip.style.borderRadius = "6px";
tooltip.style.maxWidth = "300px";
tooltip.style.zIndex = 9999;
document.body.appendChild(tooltip);

function showTooltip(e, text) {
    tooltip.style.display = "block";
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
    tooltip.textContent = text;
}

function hideTooltip() {
    tooltip.style.display = "none";
}

/* ===== DECK MENU FOR ADD ===== */
const deckMenu = document.createElement("div");
deckMenu.className = "deck-menu";
deckMenu.style.position = "absolute";
deckMenu.style.display = "none";
deckMenu.style.background = "#333";
deckMenu.style.padding = "6px";
deckMenu.style.borderRadius = "6px";
document.body.appendChild(deckMenu);

function showDeckMenu(card, x, y) {
    deckMenu.innerHTML = '';
    ['main', 'side', 'extra'].forEach(section => {
        const btn = document.createElement("button");
        btn.textContent = section.charAt(0).toUpperCase() + section.slice(1);
        btn.style.margin = "2px";
        btn.onclick = () => {
            addToDeck(card, section);
            deckMenu.style.display = 'none';
        };
        deckMenu.appendChild(btn);
    });
    deckMenu.style.left = x + "px";
    deckMenu.style.top = y + "px";
    deckMenu.style.display = "flex";
}

/* ===== RENDER FUNCTION ===== */
function render() {
    collectionGrid.innerHTML = "";
    mainDeckGrid.innerHTML = "";
    sideDeckGrid.innerHTML = "";
    extraDeckGrid.innerHTML = "";
    handGrid.innerHTML = "";
    gyGrid.innerHTML = "";
    deckSelect.innerHTML = "";

    // Deck select
    Object.keys(decks).forEach(d => {
        const o = document.createElement("option");
        o.value = d;
        o.textContent = d;
        o.selected = d === activeDeck;
        deckSelect.appendChild(o);
    });

    // Collection
    allCards.forEach(c => {
        const d = document.createElement("div");
        d.className = "card";
        d.innerHTML = `<div class="delete-btn">✖</div><img src="${c.image}"><div class="card-name">${c.name}</div>`;
        d.querySelector(".delete-btn").onclick = e => {
            e.stopPropagation();
            allCards = allCards.filter(x => x.id !== c.id);
            Object.values(decks).forEach(dk => ["main","side","extra"].forEach(s => dk[s]=dk[s].filter(x=>x.id!==c.id)));
            save(); render();
        };
        d.onclick = e => { e.stopPropagation(); showDeckMenu(c, e.pageX, e.pageY); };
        d.onmouseover = e => showTooltip(e, c.desc || "No description");
        d.onmousemove = e => showTooltip(e, c.desc || "No description");
        d.onmouseout = hideTooltip;
        collectionGrid.appendChild(d);
    });

    // Deck render
    function renderDeck(section, grid, clickableSection = null){
        const deck = decks[activeDeck][section];
        const total = deck.reduce((a,c)=>a+c.qty,0);
        deck.forEach(c=>{
            const d = document.createElement("div");
            d.className="card";
            d.dataset.id=c.id;
            d.innerHTML=`<img src="${c.image}"><div class="card-name">${c.name}</div><div class="qty">x${c.qty}</div><div class="odds">${((c.qty/total)*100).toFixed(1)}% draw | ${openingHandOdds(c.qty,total)}% opening-hand</div>`;
            const xBtn = document.createElement("div");
            xBtn.textContent="x";
            xBtn.className="delete-btn";
            xBtn.onclick = e=>{e.stopPropagation(); removeCard(section,c.id);};
            d.appendChild(xBtn);
            if(clickableSection) d.onclick=()=>moveOneCopy(c.id,section,clickableSection);

            // Tooltip
            d.onmouseover = e => showTooltip(e, c.desc || "No description");
            d.onmousemove = e => showTooltip(e, c.desc || "No description");
            d.onmouseout = hideTooltip;

            grid.appendChild(d);
        });
    }

    renderDeck("main", mainDeckGrid, "side");
    renderDeck("side", sideDeckGrid, "main");
    renderDeck("extra", extraDeckGrid);

    // Hand & GY same design as deck
    hand.forEach(c=>{
        const d=document.createElement("div");
        d.className="card";
        d.innerHTML=`<img src="${c.image}"><div class="card-name">${c.name}</div>`;
        d.onmouseover = e => showTooltip(e, c.desc || "No description");
        d.onmousemove = e => showTooltip(e, c.desc || "No description");
        d.onmouseout = hideTooltip;
        handGrid.appendChild(d);
    });
    gy.forEach(c=>{
        const d=document.createElement("div");
        d.className="card";
        d.innerHTML=`<img src="${c.image}"><div class="card-name">${c.name}</div>`;
        d.onmouseover = e => showTooltip(e, c.desc || "No description");
        d.onmousemove = e => showTooltip(e, c.desc || "No description");
        d.onmouseout = hideTooltip;
        gyGrid.appendChild(d);
    });

    deckCount.textContent = testDeck.length;
    handCount.textContent = hand.length;
    gyCount.textContent = gy.length;
}

/* ===== MOVE, ADD, REMOVE ===== */
function moveOneCopy(cardId, fromSec, toSec){
    const fromDeck = decks[activeDeck][fromSec];
    const toDeck = decks[activeDeck][toSec];
    const card = fromDeck.find(c=>c.id===cardId);
    if(!card) return;
    card.qty--;
    if(card.qty<=0) decks[activeDeck][fromSec]=fromDeck.filter(c=>c.id!==cardId);
    let existing = toDeck.find(c=>c.id===cardId);
    if(existing){ if(existing.qty<copyLimit) existing.qty++; }
    else toDeck.push({...card, qty:1});
    save(); render();
}

function removeCard(section,cardId){
    decks[activeDeck][section]=decks[activeDeck][section].filter(c=>c.id!==cardId);
    save(); render();
}

function addToDeck(card,section){
    const deck=decks[activeDeck][section];
    const total=deck.reduce((a,c)=>a+c.qty,0);
    if(total>=limits[section]) return;
    if(!card.desc) card.desc = "No description";
    let existing = deck.find(x=>x.id===card.id);
    if(existing){ if(existing.qty<copyLimit) existing.qty++; }
    else deck.push({...card, qty:1});
    save(); render();
}

/* ===== SEARCH ===== */
searchBtn.onclick=async()=>{
    const q = searchInput.value.trim(); if(!q) return;
    searchResults.innerHTML = "Searching...";
    try{
        const r = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(q)}`);
        const j = await r.json(); searchResults.innerHTML = "";
        (j.data||[]).forEach(c=>{
            const card={id:c.id,name:c.name,image:c.card_images[0].image_url, desc:c.desc || "No description"};
            const d=document.createElement("div");
            d.className="card";
            d.innerHTML=`<img src="${card.image}"><div class="card-name">${card.name}</div>`;
            d.onclick=e=>{ 
                e.stopPropagation(); 
                if(!allCards.find(x=>x.id===card.id)) allCards.push(card); 
                showDeckMenu(card, e.pageX, e.pageY);
            };
            d.onmouseover = e => showTooltip(e, card.desc);
            d.onmousemove = e => showTooltip(e, card.desc);
            d.onmouseout = hideTooltip;
            searchResults.appendChild(d);
        });
    }catch(e){searchResults.innerHTML="Error fetching cards.";}
}
closeSearchBtn.onclick = ()=>searchResults.innerHTML="";

/* ===== TEST HAND ===== */
document.getElementById("draw5").onclick = ()=>{
    resetTest(); for(let i=0;i<5;i++) drawOne();
};
document.getElementById("draw1").onclick = drawOne;
document.getElementById("millBtn").onclick = ()=>{
    let n = +document.getElementById("millCount").value;
    for(let i=0;i<n && testDeck.length;i++) gy.push({...testDeck.shift()});
    updateTest();
};
document.getElementById("resetTestBtn").onclick = resetTest;

function resetTest(){
    testDeck=[]; hand=[]; gy=[];
    decks[activeDeck].main.forEach(c=>{
        for(let i=0;i<c.qty;i++) testDeck.push({...c, desc: c.desc || "No description"});
    });
    testDeck.sort(()=>Math.random()-0.5);
    updateTest();
}

function drawOne(){
    if(!testDeck.length) return; 
    const card = testDeck.shift();
    hand.push({...card, desc: card.desc || "No description"});
    updateTest();
}

function updateTest(){ render();}

/* ===== DECK CONTROLS ===== */
deckSelect.onchange = e=>{ activeDeck=e.target.value; save(); render(); };
newDeckBtn.onclick = ()=>{ const n=prompt("Deck name?"); if(n && !decks[n]){ decks[n]={main:[],side:[],extra:[]}; activeDeck=n; save(); render(); } };
renameDeckBtn.onclick = ()=>{ const n=prompt("New name?",activeDeck); if(n && !decks[n]){ decks[n]=decks[activeDeck]; delete decks[activeDeck]; activeDeck=n; save(); render(); } };
deleteDeckBtn.onclick = ()=>{ if(Object.keys(decks).length<=1) return; delete decks[activeDeck]; activeDeck=Object.keys(decks)[0]; save(); render(); };

/* ===== IMPORT/EXPORT ===== */
importDeckBtn.onclick = ()=>importDeckInput.click();
importDeckInput.onchange=async e=>{
    const txt=await e.target.files[0].text();
    let name=prompt("Deck name?")||"Imported Deck";
    let nd={main:[],side:[],extra:[]}, sec="main";
    const cardCounts={main:{},side:{},extra:{}};
    for(let l of txt.split("\n")){
        l=l.trim().toLowerCase();
        if(l=="#side"||l=="!side"){sec="side";continue;}
        if(l=="#extra"||l=="!extra"){sec="extra";continue;}
        if(l.startsWith("#")||l.startsWith("!")) continue;
        const id=parseInt(l); if(!id) continue;
        cardCounts[sec][id]=(cardCounts[sec][id]||0)+1;
        if(cardCounts[sec][id]>copyLimit) cardCounts[sec][id]=copyLimit;
    }
    for(const secName of ["main","side","extra"]){
        for(const idStr in cardCounts[secName]){
            const id=parseInt(idStr);
            let card=allCards.find(c=>c.id===id);
            if(!card){
                try{
                    const r=await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`);
                    const j=await r.json(); const c=j.data[0];
                    card={id:c.id,name:c.name,image:c.card_images[0].image_url, desc:c.desc || "No description"};
                    allCards.push(card);
                }catch(e){card={id,name:"Unknown",image:"",desc:"No description"};}
            }
            nd[secName].push({...card, qty:cardCounts[secName][idStr]});
        }
    }
    decks[name]=nd; activeDeck=name; save(); render();
};

exportDeckBtn.onclick=()=>{
    const d=decks[activeDeck]; let t="#created by Deck Builder\n";
    d.main.forEach(c=>t+=`${c.id}\n`);
    t+="#side\n"; d.side.forEach(c=>t+=`${c.id}\n`);
    t+="#extra\n"; d.extra.forEach(c=>t+=`${c.id}\n`);
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"})); a.download=activeDeck+".ydk"; a.click();
};

collectionToggle.onclick=()=>{
    collectionSection.classList.toggle("collapsed");
    collectionToggle.textContent = collectionSection.classList.contains("collapsed") ? "⬇️ Collection" : "⬆️ Collection";
};

document.body.onclick = ()=>deckMenu.style.display='none';

render();

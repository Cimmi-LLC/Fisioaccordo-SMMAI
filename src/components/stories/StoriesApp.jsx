import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoryTemplates } from "@/hooks/useStoryTemplates";
import { useStoryBatches } from "@/hooks/useStoryBatches";
import ScheduleStoriesDialog from "@/components/schedule/ScheduleStoriesDialog";

const STORY_TYPES=[{id:"quiz",label:"Quiz (2 card)",emoji:"❓"},{id:"curiosita",label:"Curiosità",emoji:"💡"},{id:"mito_verita",label:"Mito o Verità?",emoji:"🔍"},{id:"consiglio",label:"Consiglio",emoji:"🌿"},{id:"sapevi_che",label:"Lo Sapevi Che?",emoji:"🧠"},{id:"domanda_aperta",label:"Domanda Aperta",emoji:"💬"},{id:"mini_esercizio",label:"Mini Esercizio",emoji:"🏃"},{id:"prima_dopo",label:"Prima e Dopo",emoji:"📊"}];
const TYPES_WITH_PHOTO=["curiosita","consiglio","mini_esercizio","mito_verita","sapevi_che","domanda_aperta","prima_dopo","quiz_domanda"];
const TONES=[["amichevole","Amichevole"],["professionale","Professionale"],["motivazionale","Motivazionale"],["educativo","Educativo"]];
const GFONTS=["Montserrat","Raleway","Playfair Display","Nunito","Poppins","Lato","Oswald","Merriweather","Ubuntu","DM Sans","Inter","Bebas Neue","Quicksand","Josefin Sans"];
// Unsplash not used - using Picsum Photos (no API key needed)
const BG="#F8F7FC",S="#ffffff",T="#1a1a2e",M="rgba(26,26,46,0.45)",ACC="#554697",SK="fisio_v8";
const GLASS_BD="1px solid rgba(85,70,151,0.10)",BLUR="blur(20px)";

const store={
  async set(k,v){try{localStorage.setItem(k,v);}catch{}},
  async get(k){try{return localStorage.getItem(k);}catch{return null;}}
};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const toUrl=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});

async function loadClients(){try{const raw=await store.get(SK);return raw?JSON.parse(raw):[];}catch{return[];}}
async function saveClients(list){try{await store.set(SK,JSON.stringify(list.map(c=>({...c,viBase64:null}))));}catch(e){console.warn(e);}}

function extractColors(dataUrl){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const cv=document.createElement("canvas");cv.width=120;cv.height=120;
      const ctx=cv.getContext("2d");ctx.drawImage(img,0,0,120,120);
      const data=ctx.getImageData(0,0,120,120).data;const map={};
      for(let i=0;i<data.length;i+=12){
        const r=Math.round(data[i]/30)*30,g=Math.round(data[i+1]/30)*30,b=Math.round(data[i+2]/30)*30,a=data[i+3];
        if(a<180)continue;const br=(r+g+b)/3;if(br>238||br<12)continue;
        const k=r+","+g+","+b;map[k]=(map[k]||0)+1;
      }
      const cols=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>{
        const[r,g,b]=k.split(",").map(Number);
        return"#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");
      });
      resolve(cols.length?cols:["#2d6a2d","#7bc67b"]);
    };
    img.onerror=()=>resolve(["#2d6a2d","#7bc67b"]);
    img.src=dataUrl;
  });
}

async function callAI(msgs,max=5000){
  const { data, error } = await supabase.functions.invoke('generate-stories', {
    body: { messages: msgs, max_tokens: max }
  });
  if(error){console.error("[API error]",error);throw new Error(error.message||"AI call failed");}
  if(data?.error){console.error("[API error]",data);throw new Error(data.error);}
  return data?.content?.map(b=>b.text||"").join("")||"";
}

async function extractColorsFromVI(viBase64, viMime, brandColors){
  // If no VI, return brand colors with role suggestions
  if(!viBase64 || viMime!=="application/pdf"){
    return {
      titleColor: brandColors?.[0]||"#1a1a1a",
      textColor: "#2a2a2a",
      authorColor: brandColors?.[0]||"#1a1a1a",
      accentColor: brandColors?.[1]||brandColors?.[0]||"#4a4a4a",
    };
  }
  try{
    const raw = await callAI([{role:"user",content:[
      {type:"document",source:{type:"base64",media_type:"application/pdf",data:viBase64}},
      {type:"text",text:"Analizza questa Visual Identity e restituisci i colori principali con i loro ruoli.\nRispondi SOLO con JSON (no backtick):\n{\"titleColor\":\"#hex per titoli\",\"textColor\":\"#hex per testo corpo\",\"authorColor\":\"#hex per nomi/autori\",\"accentColor\":\"#hex colore accent\",\"colors\":[\"#hex1\",\"#hex2\",\"#hex3\"]}\nSe non riesci a determinare i ruoli usa i colori principali del brand."}
    ]}],800);
    const m=raw.match(/\{[\s\S]*\}/);
    return JSON.parse(m?m[0]:raw.split("```json").join("").split("```").join("").trim());
  }catch(e){
    return {
      titleColor: brandColors?.[0]||"#1a1a1a",
      textColor: "#2a2a2a",
      authorColor: brandColors?.[0]||"#1a1a1a",
    };
  }
}


async function analyzeClientText(text){
  try{
    const raw=await callAI([{role:"user",content:"Analizza queste informazioni su uno studio di fisioterapia/osteopatia.\n\nINFO:\n"+text+"\n\nRispondi SOLO con JSON puro (no backtick, no markdown):\n{\"name\":\"nome studio\",\"city\":\"città\",\"focus\":\"specializzazione principale es. postura, atleti, mal di schiena\",\"description\":\"2-3 frasi cosa fanno\",\"services\":[\"s1\",\"s2\",\"s3\"],\"tone\":\"amichevole\",\"keywords\":[\"k1\",\"k2\"],\"brandVoice\":\"tono comunicativo\"}"}],1200);
    console.log("[analyzeClientText] raw response:", raw);
    const m=raw.match(/\{[\s\S]*\}/);
    return JSON.parse(m?m[0]:raw.trim());
  }catch(e){console.error("[analyzeClientText] error:",e);return{error:"failed"};}
}

function stripHtml(html){
  html=html.replace(/<script[\s\S]*?<\/script>/gi,"");
  html=html.replace(/<style[\s\S]*?<\/style>/gi,"");
  html=html.replace(/<nav[\s\S]*?<\/nav>/gi,"");
  html=html.replace(/<footer[\s\S]*?<\/footer>/gi,"");
  html=html.replace(/<[^>]+>/g," ");
  html=html.replace(/\s+/g," ").trim();
  return html.slice(0,6000);
}

async function fetchSiteContent(url){
  const enc=encodeURIComponent(url);
  try{
    const res=await fetch("https://corsproxy.io/?"+enc,{signal:AbortSignal.timeout(8000)});
    if(res.ok){const html=await res.text();const t=stripHtml(html);if(t.length>100)return t;}
  }catch(e){}
  try{
    const res=await fetch("https://api.allorigins.win/get?url="+enc,{signal:AbortSignal.timeout(8000)});
    if(res.ok){const data=await res.json();const t=stripHtml(data.contents||"");if(t.length>100)return t;}
  }catch(e){}
  return "";
}

// Load SheetJS for Excel parsing
function loadSheetJS(){
  return new Promise((resolve,reject)=>{
    if(window.XLSX){resolve(window.XLSX);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>resolve(window.XLSX);s.onerror=reject;
    document.head.appendChild(s);
  });
}

function loadJSZip(){
  return new Promise((resolve,reject)=>{
    if(window.JSZip){resolve(window.JSZip);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload=()=>resolve(window.JSZip);s.onerror=reject;
    document.head.appendChild(s);
  });
}

function countStars(str){
  // handle emoji stars \ue838 or unicode \u2605 or numbers like "5" or "4,5"
  if(!str)return 5;
  if(typeof str==="number")return Math.round(str);
  const s=String(str);
  // count star emoji occurrences
  const emojiCount=(s.match(/[★⭐️⭐★]/g)||[]).length;
  if(emojiCount>0)return Math.min(5,emojiCount);
  // try parsing as number
  const n=parseFloat(s.replace(",","."));
  if(!isNaN(n))return Math.min(5,Math.round(n));
  return 5;
}

function xlsxToReviews(XLSX, arrayBuffer){
  const wb=XLSX.read(arrayBuffer,{type:"array"});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
  if(rows.length<2)return[];
  const header=rows[0].map(h=>String(h||"").trim().toLowerCase());

  console.log("[XLSX] header row:", rows[0]);
  console.log("[XLSX] sample data row 1:", rows[1]);
  console.log("[XLSX] sample data row 2:", rows[2]);

  // Detect column layout
  const nameCol=header.findIndex(h=>h.includes("nome")||h.includes("name")||h.includes("reviewer")||h.includes("autore")||h.includes("author")||h.includes("utente")||h.includes("user")||h.includes("cliente")||h.includes("paziente")||h.includes("recensore")||h.includes("commenter")||h.includes("contributor"));
  const textCol=header.findIndex(h=>h.includes("testo")||h.includes("recensione")||h.includes("review")||h.includes("contenuto")||h.includes("content")||h.includes("comment")||h.includes("commento")||h.includes("feedback")||h.includes("opinione")||h.includes("snippet")||h.includes("text")||h.includes("description"));
  const starsCol=header.findIndex(h=>h.includes("valutazione")||h.includes("rating")||h.includes("stelle")||h.includes("star")||h.includes("voto")||h.includes("punteggio"));

  console.log("[XLSX] nameCol:",nameCol,"textCol:",textCol,"starsCol:",starsCol);

  const reviews=[];
  let i=1;
  while(i<rows.length){
    const row=rows[i];
    const cells_s=row.map(c=>String(c||"").trim());

    if(nameCol>=0&&textCol>=0){
      // Layout A: colonne rilevate
      const name=cells_s[nameCol]||"";
      const text=cells_s[textCol]||"";
      const stars=starsCol>=0?countStars(row[starsCol]):5;
      if(i<=3)console.log("[XLSX] LayoutA row",i,"name:",name,"text:",text.slice(0,40));
      if(text.length>10)reviews.push({name:name||"Anonimo",text:cleanReviewText(text),stars,platform:"Google Maps"});
      i++;
    } else if(nameCol>=0){
      // Layout A2: nome trovato, testo = cella più lunga
      const name=cells_s[nameCol]||"";
      const textCell=cells_s.filter((_,ci)=>ci!==nameCol&&(starsCol<0||ci!==starsCol)).reduce((a,b)=>a.length>=b.length?a:b,"");
      const stars=starsCol>=0?countStars(row[starsCol]):5;
      if(i<=3)console.log("[XLSX] LayoutA2 row",i,"name:",name,"text:",textCell.slice(0,40));
      if(textCell.length>10)reviews.push({name:name||"Anonimo",text:cleanReviewText(textCell),stars,platform:"Google Maps"});
      i++;
    } else {
      // Layout B: nessun header riconosciuto - analizza tutte le celle
      const nonempty=cells_s.filter(c=>c.length>0);
      if(!nonempty.length){i++;continue;}
      // Testo = cella con più parole/caratteri
      const longest=nonempty.reduce((a,b)=>a.length>=b.length?a:b);
      if(longest.length<=10){i++;continue;}
      const others=nonempty.filter(c=>c!==longest);
      const starsC=others.find(c=>{const n=parseFloat(c.replace(",","."));return !isNaN(n)&&n>=1&&n<=5;});
      const stars=starsC?countStars(starsC):5;
      // Nome = cella più corta non numerica
      const nameCands=others.filter(c=>c!==starsC&&c.length>=2&&c.length<80&&!/^\d/.test(c));
      const nameC=nameCands.length?nameCands.reduce((a,b)=>a.length<=b.length?a:b):"";
      if(i<=3)console.log("[XLSX] LayoutB row",i,"cells:",cells_s,"→ name:",nameC,"text:",longest.slice(0,40));
      if(!nameC&&i+1<rows.length){
        // Prova layout righe alternate: nome riga successiva
        const nxt=rows[i+1].map(c=>String(c||"").trim()).filter(c=>c.length>=2&&c.length<80&&!/^\d/.test(c));
        const nxtLong=nxt.length?nxt.reduce((a,b)=>a.length>=b.length?a:b):"";
        if(nxtLong.length>0&&nxtLong.length<longest.length/2){
          reviews.push({name:nxtLong,text:cleanReviewText(longest),stars,platform:"Google Maps"});
          i+=2;continue;
        }
      }
      reviews.push({name:nameC||"Anonimo",text:cleanReviewText(longest),stars,platform:"Google Maps"});
      i++;
    }
  }
  return reviews.filter(r=>r.text&&r.text.length>10);
}

async function parseFileReviews(file){
  const ext=file.name.split(".").pop().toLowerCase();
  
  // PDF -> base64 -> AI
  if(ext==="pdf"){
    const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
    const raw=await callAI([{role:"user",content:[
      {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
      {type:"text",text:"Estrai TUTTE le recensioni da questo PDF. Rispondi SOLO con un array JSON grezzo, senza backtick, senza markdown, senza testo prima o dopo. Formato:\n[{\"name\":\"Nome Cognome\",\"text\":\"testo completo\",\"stars\":5,\"platform\":\"Trustpilot\"}]\nSe manca il nome usa \"Anonimo\". Includi ogni singola recensione."}
    ]}],8000);
    // Rimuovi backtick markdown
    const cleaned=raw.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
    const s=cleaned.indexOf("[");
    if(s===-1)throw new Error("Nessun JSON nel PDF");
    const e=cleaned.lastIndexOf("]");
    let jsonStr;
    if(e>s){
      // JSON completo: usa slice preciso
      jsonStr=cleaned.slice(s,e+1);
    } else {
      // JSON troncato: rimuovi ultimo elemento incompleto e chiudi l'array
      jsonStr=cleaned.slice(s).replace(/,\s*\{[^}]*$/,"").replace(/,\s*$/,"")+"]";
    }
    return JSON.parse(jsonStr);
  }
  
  // XLSX/XLS -> SheetJS -> direct parse (no AI needed!)
  if(ext==="xlsx"||ext==="xls"){
    const XLSX=await loadSheetJS();
    const buf=await file.arrayBuffer();
    const reviews=xlsxToReviews(XLSX,buf);
    if(reviews.length>0)return reviews;
    // fallback: convert to CSV text and send to AI
    const wb=XLSX.read(buf,{type:"array"});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const csv=XLSX.utils.sheet_to_csv(ws).slice(0,8000);
    const raw=await callAI([{role:"user",content:"Estrai TUTTE le recensioni da questo CSV di Google Maps. SOLO array JSON senza backtick:\n[{\"name\":\"..\",\"text\":\"testo completo\",\"stars\":5,\"platform\":\"Google Maps\"}]\n\nCSV:\n"+csv}],4000);
    const s=raw.indexOf("["),e=raw.lastIndexOf("]");
    if(s===-1||e===-1)throw new Error("No JSON");
    return JSON.parse(raw.slice(s,e+1));
  }
  
  // TXT/CSV -> text -> AI
  const text=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(file,"UTF-8");});
  const raw=await callAI([{role:"user",content:"Estrai TUTTE le recensioni da questo testo. SOLO array JSON senza backtick:\n[{\"name\":\"..\",\"text\":\"testo completo\",\"stars\":5,\"platform\":\"..\"}]\n\nTESTO:\n"+text.slice(0,8000)}],4000);
  const s=raw.indexOf("["),e=raw.lastIndexOf("]");
  if(s===-1||e===-1)throw new Error("No JSON");
  return JSON.parse(raw.slice(s,e+1));
}

function cleanReviewText(t){
  if(!t)return t;
  return t
    .replace(/\s*(Show more|Show less|Mostra di più|Mostra meno|Leggi di più|Leggi meno|Read more|Read less|\.\.\.Show more|\.\.\.Show less)\s*/gi," ")
    .replace(/\s+/g," ").trim();
}

async function parseManualText(text){
  const prompt="Estrai TUTTE le recensioni da questo testo e strutturale in array JSON.\nOgni recensione deve avere: name (stringa), text (testo completo recensione), stars (numero 1-5), platform (stringa).\nSe le stelle non sono indicate usa 5.\nRispondi SOLO con l\'array JSON, senza backtick, senza testo prima o dopo.\n\nTESTO:\n"+text;
  const raw=await callAI([{role:"user",content:prompt}],4000);
  // robust parsing: find first [ and last ]
  const start=raw.indexOf("[");
  const end=raw.lastIndexOf("]");
  if(start===-1||end===-1)throw new Error("No JSON array found");
  const arr=JSON.parse(raw.slice(start,end+1));
  return arr.map(r=>({...r,text:cleanReviewText(r.text)}));
}

// Mappa keyword fisio -> seed Picsum coerente con il tema
const PHOTO_SEEDS={
  "posture":10,"back pain":20,"spine":30,"physiotherapy":40,"osteopathy":50,
  "exercise":60,"rehabilitation":70,"massage":80,"sport":90,"running":100,
  "yoga":110,"stretching":120,"neck":130,"shoulder":140,"knee":150,
  "pain":160,"wellness":170,"health":180,"body":190,"muscle":200,
  "breathing":210,"relaxation":220,"meditation":230,"movement":240,"balance":250,
};

function photoSeedFromQuery(q){
  if(!q)return Math.floor(Math.random()*500)+1;
  const lower=q.toLowerCase();
  for(const [k,v] of Object.entries(PHOTO_SEEDS)){
    if(lower.includes(k))return v;
  }
  // Hash the query string to a consistent number
  let h=0;for(let i=0;i<lower.length;i++)h=(h*31+lower.charCodeAt(i))&0xffff;
  return (h%900)+100;
}

// Cache key version: bump to force invalidation across deploys/code changes.
// IMPORTANT: only successful URL responses are cached; nulls are NOT cached so
// transient failures don't poison the cache for the rest of the session.
const FETCH_PHOTO_CACHE_VERSION='v4';
const photoCache=new Map();

// NO topic anchor anymore. The LLM's photoQuery is already topical
// (back pain, posture, etc.). Adding "medical" / "european" / "professional"
// was over-constraining the search and returning zero results from Freepik.
// We rely on server-side hard-reject for the few wildlife/landscape outliers.
const TOPIC_ANCHOR='';

async function fetchPhoto(q, brandId){
  if(!q){
    console.log('[fetchPhoto] ❌ no query, skipping');
    return null;
  }
  // anchor is intentionally empty now — LLM's photoQuery is already topical
  const anchoredQuery=TOPIC_ANCHOR?`${q} ${TOPIC_ANCHOR}`:q;
  const cacheKey=`${FETCH_PHOTO_CACHE_VERSION}::${brandId||'-'}::${anchoredQuery}`;
  if(photoCache.has(cacheKey)){
    const cached=photoCache.get(cacheKey);
    console.log('[fetchPhoto] 💾 cache hit for "'+q+'":',cached?'✅ '+cached.slice(0,80):'❌ null');
    return cached;
  }
  console.log('[fetchPhoto] 🔍 calling edge function for "'+q+'" (brandId:',brandId||'none',')');
  try{
    const { data, error } = await supabase.functions.invoke('generate-carousel-images',{
      body:{
        slides:[{tipo:'content',keywords_stock:[anchoredQuery],numero:1}],
        singleIndex:0,
        brandId:brandId||undefined,
      },
    });
    if(error){
      console.error('[fetchPhoto] ❌ edge function error:',error);
      return null; // don't cache failures
    }
    console.log('[fetchPhoto] 📦 response data:',data);
    const url=data?.images?.[0]?.url||null;
    const errMsg=data?.images?.[0]?.error||null;
    const queryUsed=data?.images?.[0]?.queryUsed||null;
    if(url){
      console.log('[fetchPhoto] ✅ got URL for "'+q+'":',url.slice(0,100),'(query used:',queryUsed,')');
      photoCache.set(cacheKey,url);
      return url;
    }
    if(errMsg==='freepik_rate_limit'){
      // Cache null to avoid hammering the API — limit resets in ~24h
      console.warn('[fetchPhoto] 🚫 Freepik daily rate limit reached. Foto disabilitate per oggi.');
      photoCache.set(cacheKey,null);
      return null;
    }
    console.warn('[fetchPhoto] ❌ no URL for "'+q+'" — error:',errMsg,'queryUsed:',queryUsed);
    return null;
  }catch(e){
    console.error('[fetchPhoto] 💥 exception for "'+q+'":',e);
    return null; // don't cache exceptions
  }
}

async function loadImg(src){
  return new Promise(res=>{
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>res(img);
    img.onerror=()=>res(null);
    img.src=src;
  });
}
function drawWrap(ctx,text,cx,y,maxW,lineH){
  if(!text)return y;ctx.textAlign="center";const words=text.split(" ");let line="";
  for(const w of words){const t=line?line+" "+w:w;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,cx,y);line=w;y+=lineH;}else line=t;}
  if(line){ctx.fillText(line,cx,y);y+=lineH;}return y;
}
function drawWrapLeft(ctx,text,x,y,maxW,lineH){
  if(!text)return y;ctx.textAlign="left";const words=text.split(" ");let line="";
  for(const w of words){const t=line?line+" "+w:w;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,y);line=w;y+=lineH;}else line=t;}
  if(line){ctx.fillText(line,x,y);y+=lineH;}return y;
}
function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

// Carica Google Font e aspetta che sia disponibile nel canvas
const _fontCache={};
async function ensureFont(family){
  if(_fontCache[family])return;
  try{
    // Inject link se non già presente
    const id="gf-"+family.replace(/\s/g,"-");
    if(!document.getElementById(id)){
      const link=document.createElement("link");
      link.id=id; link.rel="stylesheet";
      link.href="https://fonts.googleapis.com/css2?family="+encodeURIComponent(family)+":wght@400;700;900&display=swap";
      document.head.appendChild(link);
    }
    // Aspetta che document.fonts lo conosca (max 3s)
    await Promise.race([
      document.fonts.load("900 40px '"+family+"'").then(()=>document.fonts.load("400 40px '"+family+"'")),
      new Promise(r=>setTimeout(r,3000))
    ]);
    _fontCache[family]=true;
  }catch(e){
    // fallback: attendi 500ms
    await new Promise(r=>setTimeout(r,500));
    _fontCache[family]=true;
  }
}

/**
 * Merge lines that look like a SINGLE sentence the LLM split with \n.
 * If a line doesn't end with sentence punctuation AND the next line isn't a
 * list/option marker (A. / B. / C. / 1. / -), they get joined into one line.
 * Empty lines and proper paragraph breaks are preserved.
 */
function mergeBrokenSentences(text){
  if(!text)return text;
  const lines=text.split("\n");
  const out=[];
  for(let i=0;i<lines.length;i++){
    const cur=lines[i].trim();
    if(!cur){continue;}
    if(out.length>0){
      const prev=out[out.length-1];
      const prevEndsSentence=/[.!?:;…)]$/.test(prev);
      const curIsListItem=/^([A-C][.\)]|\d+[.\)]|[-•])\s/.test(cur);
      if(!prevEndsSentence && !curIsListItem){
        out[out.length-1]=prev+" "+cur;
        continue;
      }
    }
    out.push(cur);
  }
  return out.join("\n");
}

/**
 * Relative luminance (0..1) of a hex color via WCAG-style sRGB formula.
 * Returns ~0 for black, ~1 for white.
 */
function colorLuminance(hex){
  if(!hex||typeof hex!=="string")return 0.5;
  const h=hex.replace("#","");
  if(h.length!==6)return 0.5;
  const toLin=v=>{const s=v/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);};
  const r=toLin(parseInt(h.slice(0,2),16));
  const g=toLin(parseInt(h.slice(2,4),16));
  const b=toLin(parseInt(h.slice(4,6),16));
  return 0.2126*r+0.7152*g+0.0722*b;
}

/**
 * Configure ctx so that drawn text gets a subtle dark shadow IF the chosen
 * fill color would be too washed out on a white bg. Call `clearContrastShadow`
 * after drawing to reset.
 */
function applyContrastShadow(ctx, fillHex){
  if(colorLuminance(fillHex) > 0.55){
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
  }
}
function clearContrastShadow(ctx){
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

async function renderJpeg(story, client, photoImg){
  const W=1080, H=1920;
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d");
  const fn="'"+(client.brandFont||"Montserrat")+"', sans-serif";
  const colors=client.brandColors?.length>=2?client.brandColors:["#2d6a2d","#7bc67b"];
  const primary=colors[0], secondary=colors[1]||colors[0];
  const isAnswer=story.cardType==="quiz_risposta";
  const bgLight=client.bgIsLight!==false;

  // Background
  if(client.templateDataUrl){
    const bg=await loadImg(client.templateDataUrl);
    if(bg) ctx.drawImage(bg,0,0,W,H);
    else { ctx.fillStyle=bgLight?"#f5f5f5":"#111"; ctx.fillRect(0,0,W,H); }
  } else {
    ctx.fillStyle=bgLight?"#f5f5f5":"#111"; ctx.fillRect(0,0,W,H);
  }

  // Safe zone: logo nel template occupa ~22% -> contenuto parte dal 25%
  // (più alto del 37% precedente per ridurre il vuoto sotto al logo)
  const SAFE_TOP = client.templateDataUrl ? Math.round(H*0.25) : Math.round(H*0.12);
  const SAFE_BOT = client.templateDataUrl ? Math.round(H*0.88) : Math.round(H*0.92);
  const PAD=90, cW=W-PAD*2;
  let cy = SAFE_TOP;

  // -- BADGE TIPOLOGIA ------------------------------------------
  const bTxt=(story.typeLabel||"").toUpperCase();
  ctx.font="700 30px "+fn;
  const bw=ctx.measureText(bTxt).width+56, bh=52, bx=(W-bw)/2;
  // pill background
  ctx.save(); ctx.globalAlpha=0.14; ctx.fillStyle=primary;
  rrect(ctx,bx,cy,bw,bh,bh/2); ctx.fill(); ctx.restore();
  // pill border
  ctx.save(); ctx.globalAlpha=0.35; ctx.strokeStyle=primary; ctx.lineWidth=1.5;
  rrect(ctx,bx,cy,bw,bh,bh/2); ctx.stroke(); ctx.restore();
  ctx.fillStyle=primary; ctx.textAlign="center"; ctx.font="700 30px "+fn;
  ctx.fillText(bTxt, W/2, cy+35);
  cy += bh+28;

  // -- IMMAGINE / EMOJI -----------------------------------------
  // Se c'è la foto la disegniamo (rounded rect centrata) e SALTIAMO l'emoji.
  // Emoji solo come fallback quando manca la foto.
  if(photoImg){
    const imgW=Math.round(W*0.66);   // ~712px, centrata
    const imgH=Math.round(imgW*0.62); // 16:10 portrait-ish
    const imgX=(W-imgW)/2;
    const imgY=cy;
    const radius=32;
    // cover-crop the source into the target rect
    const sR=photoImg.width/photoImg.height;
    const dR=imgW/imgH;
    let sx=0,sy=0,sw=photoImg.width,sh=photoImg.height;
    if(sR>dR){sw=photoImg.height*dR;sx=(photoImg.width-sw)/2;}
    else{sh=photoImg.width/dR;sy=(photoImg.height-sh)/2;}
    ctx.save();
    rrect(ctx,imgX,imgY,imgW,imgH,radius);
    ctx.clip();
    ctx.drawImage(photoImg,sx,sy,sw,sh,imgX,imgY,imgW,imgH);
    ctx.restore();
    cy+=imgH+32;
  } else if(story.emoji){
    ctx.font="96px serif"; ctx.textAlign="center";
    ctx.fillText(story.emoji, W/2, cy+86);
    cy += 120;
  }

  // -- HEADLINE / TITOLO ----------------------------------------
  // Titolo in colore SECONDARY (orange) - accent eye-catching.
  // Auto-shadow se il brand color è troppo chiaro per bg bianco.
  const hlFs = isAnswer?62:72;
  const hlLh = hlFs*1.25;
  ctx.fillStyle=secondary;
  ctx.font="900 "+hlFs+"px "+fn;
  applyContrastShadow(ctx, secondary);
  cy = drawWrap(ctx, story.headline||"", W/2, cy+hlFs, cW, hlLh);
  clearContrastShadow(ctx);
  cy += 18;

  // Separatore decorativo (matcha colore titolo)
  ctx.save();
  const sep=ctx.createLinearGradient(W*0.25,0,W*0.75,0);
  sep.addColorStop(0,secondary+"00"); sep.addColorStop(0.5,secondary+"99"); sep.addColorStop(1,secondary+"00");
  ctx.strokeStyle=sep; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(W*0.25,cy); ctx.lineTo(W*0.75,cy); ctx.stroke();
  ctx.restore();
  cy += 28;

  // -- TESTO CORPO ------------------------------------------------
  // Body in PRIMARY. mergeBrokenSentences ricuce frasi spezzate dal LLM con \n.
  // Interlinea fs*1.2, gap inter-paragrafo 10px (10/20 prima).
  const cleanedText=mergeBrokenSentences(story.text||"");
  const paras=cleanedText.split("\n").map(p=>p.trim()).filter(Boolean);
  for(let pi=0;pi<paras.length;pi++){
    const p=paras[pi];
    const isOpt=/^[A-C][\.\) ]/.test(p);
    const fs=isOpt?46:42;
    const lh=fs*1.2;
    const fillCol=isOpt?secondary:primary;
    ctx.fillStyle=fillCol;
    ctx.font=(isOpt?"700":"400")+" "+fs+"px "+fn;
    applyContrastShadow(ctx, fillCol);
    cy=drawWrap(ctx,p,W/2,cy+fs,cW,lh);
    clearContrastShadow(ctx);
    cy+=isOpt?8:10;
    if(cy>SAFE_BOT) break;
  }

  // Hint quiz domanda
  if(story.cardType==="quiz_domanda"){
    cy+=20;
    ctx.fillStyle=secondary; ctx.font="italic 500 34px "+fn; ctx.textAlign="center";
    ctx.globalAlpha=0.75;
    ctx.fillText("👉 Risposta nella prossima storia!",W/2,cy);
    ctx.globalAlpha=1;
  }

  return cv.toDataURL("image/jpeg",0.93);
}


function getHue(hex){
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  if(d===0)return 0;
  let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
  return Math.round(h*60+360)%360;
}

async function renderReviewJpeg(reviews_input, client, colorOverrides={}){
  const reviewList = Array.isArray(reviews_input) ? reviews_input : [reviews_input];
  const n = reviewList.length;
  const W=1080, H=1920;
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d");
  const fn = "'"+(client.brandFont||"Montserrat")+"', sans-serif";
  const colors = client.brandColors?.length>=2 ? client.brandColors : ["#2d6a2d","#7bc67b"];
  const p1=colors[0], p2=colors[1]||colors[0];
  const bgLight = client.bgIsLight!==false;

  // Colori - usa override se fornito, altrimenti scegli il colore più scuro per testi su sfondo chiaro
  const lum=hex=>{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return 0.2126*r+0.7152*g+0.0722*b;};
  const darkCol = colors.reduce((a,b)=>lum(a)<=lum(b)?a:b, p1);
  const lightCol = colors.reduce((a,b)=>lum(a)>=lum(b)?a:b, p2);
  const titleCol   = colorOverrides.titleColor  || (bgLight ? darkCol : lightCol);
  const authorCol  = colorOverrides.authorColor || (bgLight ? darkCol : lightCol);
  const reviewTextColor = colorOverrides.textColor || (bgLight ? "#2a2a2a" : "#e8e8e8");
  const cardBg = bgLight ? "rgba(255,255,255,0.97)" : "rgba(14,24,14,0.95)";

  // 1. Draw background
  if(client.templateDataUrl){
    const bg = await loadImg(client.templateDataUrl);
    if(bg) ctx.drawImage(bg,0,0,W,H);
    else { ctx.fillStyle=bgLight?"#f5f5f5":"#111"; ctx.fillRect(0,0,W,H); }
  } else {
    ctx.fillStyle=bgLight?"#f5f5f5":"#111"; ctx.fillRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0,p1+"18"); g.addColorStop(1,p2+"0a");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }

  // 2. Safe zone - logo nel template occupa ~22% -> contenuto dal 25%
  // (ridotto dal 37% per limitare il vuoto sotto al logo)
  const SAFE_TOP = client.templateDataUrl ? Math.round(H * 0.25) : 120;
  const SAFE_BOT = H - 60;
  const AVAIL = SAFE_BOT - SAFE_TOP;

  const PAD = 56;
  const CARD_W = W - PAD*2;

  // 3. Font sizes - compatti e proporzionati
  const TITLE_FS  = 52;   // "Cosa dicono di noi:" - visibile ma non enorme
  const STAR_FS   = n===1 ? 44 : n===2 ? 38 : 32;
  const TEXT_FS   = n===1 ? 38 : n===2 ? 34 : 28;
  const NAME_FS   = n===1 ? 34 : n===2 ? 30 : 26;  // più piccolo del testo
  const LH        = TEXT_FS * 1.6;
  const INNER_H   = 36;
  const INNER_W   = 36;
  const BAR_W     = 8;

  // 4. Misura altezza naturale di ogni card
  ctx.font = "400 "+TEXT_FS+"px "+fn;
  const MAX_TEXT_W = CARD_W - BAR_W - INNER_W*2;

  function measureLines(text){
    const words=(text||"").split(" ");
    let lines=1, line="";
    for(const w of words){
      const t=line?line+" "+w:w;
      if(ctx.measureText(t).width>MAX_TEXT_W&&line){lines++;line=w;}else line=t;
    }
    return lines;
  }

  function naturalCardH(rev){
    const lines = measureLines(rev.text||"");
    return INNER_H + STAR_FS + 14 + Math.ceil(lines*LH) + 18 + 1 + 16 + NAME_FS + INNER_H;
  }

  const naturalH = reviewList.map(naturalCardH);
  const totalGaps = (n-1);
  // Gap minimo 16, calcolato in base allo spazio rimanente dopo il titolo
  const TITLE_BLOCK = TITLE_FS + 32; // title + underline + margin
  const cardsAvail = AVAIL - TITLE_BLOCK;
  const totalNatural = naturalH.reduce((a,b)=>a+b,0);
  const gapRaw = totalGaps>0 ? (cardsAvail - totalNatural) / totalGaps : 0;
  const GAP = Math.min(48, Math.max(14, gapRaw));

  // Se le card non ci stanno, scala le altezze
  let cardH_arr;
  const totalWithGap = totalNatural + GAP*totalGaps;
  if(totalWithGap <= cardsAvail){
    cardH_arr = naturalH;
  } else {
    const scale = cardsAvail / (totalNatural + 14*totalGaps);
    cardH_arr = naturalH.map(h=>Math.max(120, Math.floor(h*scale)));
  }

  // 5. Titolo "Cosa dicono di noi:"
  const titleY = SAFE_TOP;

  // Pill background dietro il titolo per leggibilità sul template
  const titleText = "Cosa dicono di noi:";
  ctx.font = "900 "+TITLE_FS+"px "+fn;
  const titleW = ctx.measureText(titleText).width;
  const pillPad = 28;
  const pillX = (W-titleW)/2 - pillPad;
  const pillW = titleW + pillPad*2;
  const pillH = TITLE_FS + 20;
  ctx.save();
  ctx.fillStyle = bgLight ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.65)";
  rrect(ctx, pillX, titleY-TITLE_FS+2, pillW, pillH, pillH/2);
  ctx.fill();
  ctx.restore();

  // Titolo - colore primario (es. verde scuro), bold, leggibile
  ctx.fillStyle = titleCol;
  ctx.font = "900 "+TITLE_FS+"px "+fn;
  ctx.textAlign = "center";
  ctx.fillText(titleText, W/2, titleY);

  // Linea decorativa
  const lineY = titleY + 16;
  ctx.save();
  const ul=ctx.createLinearGradient(W*0.3,0,W*0.7,0);
  ul.addColorStop(0,titleCol+"00"); ul.addColorStop(0.5,titleCol+"aa"); ul.addColorStop(1,titleCol+"00");
  ctx.strokeStyle=ul; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(W*0.3,lineY); ctx.lineTo(W*0.7,lineY); ctx.stroke();
  ctx.restore();

  // 6. Card recensioni
  let cy = titleY + TITLE_BLOCK;

  for(let ri=0; ri<n; ri++){
    const rev = reviewList[ri];
    const cH = cardH_arr[ri];
    const stars = Math.min(5,Math.max(1,rev.stars||5));
    const name = rev.name||"Anonimo";
    const text = rev.text||"";

    // Card shadow + sfondo
    ctx.save();
    ctx.shadowColor="rgba(0,0,0,0.13)"; ctx.shadowBlur=24; ctx.shadowOffsetY=5;
    ctx.fillStyle=cardBg;
    rrect(ctx,PAD,cy,CARD_W,cH,32); ctx.fill();
    ctx.restore();

    // Barra colorata sinistra
    ctx.save();
    const bar=ctx.createLinearGradient(0,cy,0,cy+cH);
    bar.addColorStop(0,p1); bar.addColorStop(1,p2);
    ctx.fillStyle=bar;
    rrect(ctx,PAD,cy,BAR_W,cH,4); ctx.fill();
    ctx.restore();

    const iX = PAD + BAR_W + INNER_W;
    const iW = CARD_W - BAR_W - INNER_W*2;
    let iy = cy + INNER_H;

    // Stelle
    ctx.font = STAR_FS+"px serif";
    ctx.textAlign="left";
    for(let i=0;i<5;i++){
      ctx.fillStyle = i<stars ? p2 : (bgLight?"#ddd":"#444");
      ctx.fillText("★", iX+i*(STAR_FS+2), iy+STAR_FS);
    }
    iy += STAR_FS + 14;

    // Testo recensione
    ctx.font = "400 "+TEXT_FS+"px "+fn;
    ctx.fillStyle = reviewTextColor;
    ctx.textAlign = "left";
    const nameAreaH = 18 + 1 + 16 + NAME_FS + INNER_H;
    const textAreaH = cH - INNER_H - STAR_FS - 14 - nameAreaH;
    const maxLines = Math.max(2, Math.floor(textAreaH / LH));
    const words = text.split(" ");
    let line="", lc=0;
    for(const w of words){
      const t=line?line+" "+w:w;
      if(ctx.measureText(t).width>iW&&line){
        if(lc>=maxLines-1){ ctx.fillText(line+"...",iX,iy+TEXT_FS); iy+=LH; lc++; line=""; break; }
        ctx.fillText(line,iX,iy+TEXT_FS); line=w; iy+=LH; lc++;
      } else line=t;
    }
    if(line&&lc<maxLines){ ctx.fillText(line,iX,iy+TEXT_FS); iy+=LH; }

    // Separatore
    iy += 18;
    ctx.save();
    ctx.strokeStyle=p1; ctx.lineWidth=1; ctx.globalAlpha=0.15;
    ctx.beginPath(); ctx.moveTo(iX,iy); ctx.lineTo(iX+iW,iy); ctx.stroke();
    ctx.restore();
    iy += 16;

    // Nome autore - colore primario (verde scuro), compatto
    ctx.fillStyle = authorCol;
    ctx.font = "700 "+NAME_FS+"px "+fn;
    ctx.textAlign = "left";
    ctx.fillText("- "+name, iX, iy+NAME_FS);

    cy += cH + (ri<n-1 ? GAP : 0);
  }

  return cv.toDataURL("image/jpeg",0.93);
}


async function generateStories(client,qty,activeTypes){
  const allowedIds = new Set(activeTypes);
  const allowedTypes = activeTypes.map(id=>STORY_TYPES.find(s=>s.id===id)).filter(Boolean);
  const allowedList = allowedTypes.map(t=>`"${t.id}" (${t.label})`).join(", ");
  const info=client.clientInfo&&!client.clientInfo.error?"\nInfo studio: "+(client.clientInfo.description||"")+"\nServizi: "+(client.clientInfo.services||[]).join(", "):"";
  const content=[];
  if(client.viBase64&&client.viMime==="application/pdf")content.push({type:"document",source:{type:"base64",media_type:"application/pdf",data:client.viBase64}});

  const prompt = `Crea ESATTAMENTE ${qty} storie Instagram per "${client.name}"${client.city?", "+client.city:""}.
Tono: ${client.tone}.${client.focus?"\nFocus: "+client.focus:""}${info}

REGOLA TASSATIVA TIPOLOGIE:
Tipologie consentite: ${allowedList}
DEVI usare SOLO queste tipologie. NON inventare altre tipologie. NON usare tipologie diverse da quelle elencate.
Se è selezionata UNA SOLA tipologia, TUTTE le storie devono essere di quel tipo.
Se sono selezionate più tipologie, distribuisci le storie tra di esse in modo bilanciato.

LIMITI TESTO (CRITICO per stare nei margini del template):
- headline: massimo 50 caratteri (1 riga)
- text: massimo 200 caratteri totali (3-4 righe brevi)
- Frasi corte e dirette, niente paragrafi lunghi
- Il testo verrà visualizzato in un template 1080x1920, deve stare nei margini

QUIZ RULE: ogni quiz = 2 oggetti consecutivi:
1. cardType "quiz_domanda": headline=domanda breve, text="A. opzione\\nB. opzione\\nC. opzione" (max 30 char per opzione)
2. cardType "quiz_risposta": headline="Risposta: X", text="spiegazione breve, max 150 char"

LUNGHEZZA per tipo:
- curiosita/sapevi_che: 1-2 frasi brevi con emoji (max 150 char)
- consiglio: 2-3 frasi corte separate da \\n (max 200 char)
- mini_esercizio: 3-4 passi numerati separati da \\n (max 200 char)
- mito_verita: 1 affermazione + 1 verità (max 150 char)
- domanda_aperta: domanda breve + invito a rispondere (max 100 char)
- prima_dopo: confronto breve prima/dopo (max 150 char)

REGOLE per il campo "photoQuery":
- 2-3 parole INGLESI semplici e generaliste, inerenti a SALUTE / BENESSERE / FISICO
- Preferisci parole comuni che esistono SICURAMENTE in stock photography
- Esempi BUONI: "back pain", "good posture", "stretching exercise", "yoga", "office desk", "running", "healthy food", "meditation", "elderly walking", "neck massage", "knee pain"
- Esempi DA EVITARE: parole inventate, frasi lunghe (>4 parole), metafore, termini medici tecnici troppo specifici
- Per storie di tipo quiz_domanda / quiz_risposta usa null (non servono foto)
- Per ogni altra storia di solito metti una query concreta

FORMATO SOLO array JSON puro (no backtick, no markdown):
[{"type":"id","cardType":"normal","typeLabel":"Nome","emoji":"e","headline":"h","text":"t","photoQuery":"2-3 parole semplici inglesi oppure null"}]

Il campo "type" DEVE essere uno tra: ${activeTypes.join(", ")}
NO CTA commerciali. NO prezzi. NO numeri di telefono.`;

  content.push({type:"text",text:prompt});
  const raw=await callAI([{role:"user",content}]);
  const s=raw.indexOf("["),e=raw.lastIndexOf("]");
  if(s===-1||e===-1)throw new Error("No JSON array");
  const all = JSON.parse(raw.slice(s,e+1));

  // Filter: keep only stories whose type is in allowedTypes
  const filtered = all.filter(story => {
    const t = story.type || story.cardType?.replace(/_(domanda|risposta)$/, '');
    if (story.cardType === 'quiz_domanda' || story.cardType === 'quiz_risposta') {
      return allowedIds.has('quiz');
    }
    return allowedIds.has(t);
  });

  return filtered.length > 0 ? filtered : all;
}

const Lbl=({c})=><div style={{fontSize:10,color:'var(--ink2)',fontFamily:'Montserrat,sans-serif',textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6,fontWeight:800}}>{c}</div>;
const Inp=({sx,...p})=><input style={{width:"100%",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:9,padding:"8px 12px",color:"var(--ink)",fontSize:12,fontWeight:500,outline:"none",boxSizing:"border-box",fontFamily:"Montserrat,sans-serif",transition:"border-color .15s",...sx}} onFocus={e=>{e.currentTarget.style.borderColor='var(--rosa)';}} onBlur={e=>{e.currentTarget.style.borderColor='var(--line)';}} {...p}/>;
const Sel=({children,sx,...p})=><select style={{width:"100%",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:9,padding:"8px 12px",color:"var(--ink)",fontSize:12,fontWeight:500,outline:"none",boxSizing:"border-box",fontFamily:"Montserrat,sans-serif",transition:"border-color .15s",...sx}} {...p}>{children}</select>;
const PBtn=({children,sx,...p})=><button style={{background:p.disabled?"rgba(85,70,151,0.08)":"var(--rosa)",border:"none",borderRadius:10,padding:"11px 22px",color:p.disabled?"rgba(85,70,151,0.30)":"#ffffff",fontSize:12,fontWeight:800,cursor:p.disabled?"not-allowed":"pointer",fontFamily:"Montserrat,sans-serif",textTransform:"uppercase",letterSpacing:"0.5px",transition:"background .2s",...sx}} {...p}>{children}</button>;
const SBtn=({children,sx,...p})=><button style={{background:"transparent",border:"1px solid var(--line)",borderRadius:10,padding:"10px 16px",color:"var(--ink3)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Montserrat,sans-serif",transition:"background .2s,border-color .2s",...sx}} {...p}>{children}</button>;
const Chip=({sel,children,onClick})=><button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:sel?700:500,cursor:"pointer",border:sel?"1px solid var(--viola)":"1px solid var(--line)",background:sel?"var(--viola-dim)":"var(--bg)",color:sel?"var(--viola)":"var(--ink3)",fontFamily:"Montserrat,sans-serif",transition:"all .15s"}}>{children}</button>;

function UpZone({label,accept,value,preview,onChange,hint}){
  const ref=useRef();
  return <div>
    <Lbl c={label}/>
    <div onClick={()=>ref.current.click()} style={{border:`2px dashed ${value?"var(--viola)":"var(--line)"}`,borderRadius:12,padding:16,background:value?"var(--viola-dim)":"var(--bg)",cursor:"pointer",textAlign:"center",minHeight:80,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,transition:"border-color .2s,background .2s"}}>
      {preview&&value?<img src={value} alt="" style={{maxHeight:80,borderRadius:8,objectFit:"contain"}}/>:<><span style={{fontSize:22,opacity:0.4}}>{value?"✓":"↑"}</span><span style={{fontSize:11,color:value?"var(--viola)":"var(--ink3)",fontWeight:value?600:400,fontFamily:"Montserrat,sans-serif"}}>{value?"Caricato":(hint||"Clicca")}</span></>}
    </div>
    <input ref={ref} type="file" accept={accept} style={{display:"none"}} onChange={onChange}/>
  </div>;
}

function ZoomModal({jpg,onClose}){
  if(!jpg)return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{position:"relative",maxHeight:"90vh",maxWidth:430}}>
      <img src={jpg} alt="" style={{width:"100%",borderRadius:16,display:"block",maxHeight:"88vh",objectFit:"contain"}}/>
      <button onClick={onClose} style={{position:"absolute",top:-14,right:-14,width:32,height:32,borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--line)",color:"var(--ink)",fontSize:18,cursor:"pointer",lineHeight:1,fontFamily:"Montserrat,sans-serif",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>×</button>
    </div>
  </div>;
}

function ReviewEditModal({review,onSave,onClose}){
  const [r,setR]=useState({...review});
  const set=(k,v)=>setR(p=>({...p,[k]:v}));
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--surface)",borderRadius:20,padding:28,width:"100%",maxWidth:500,border:"1px solid var(--line)",boxShadow:"0 8px 30px rgba(0,0,0,0.12)",display:"flex",flexDirection:"column",gap:16,animation:"fadeSlideUp .3s ease"}}>
      <div style={{fontWeight:800,fontSize:16,color:"var(--ink)",letterSpacing:"-0.3px",fontFamily:"Montserrat,sans-serif"}}>Modifica Recensione</div>
      <div><Lbl c="Nome"/><Inp value={r.name||""} onChange={e=>set("name",e.target.value)}/></div>
      <div><Lbl c="Testo"/><textarea value={r.text||""} onChange={e=>set("text",e.target.value)} style={{width:"100%",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:9,padding:"8px 12px",color:"var(--ink)",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"Montserrat,sans-serif",resize:"vertical",minHeight:120}}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><Lbl c="Stelle (1-5)"/><Inp type="number" min={1} max={5} value={r.stars||5} onChange={e=>set("stars",+e.target.value)}/></div>
        <div><Lbl c="Piattaforma"/><Inp value={r.platform||""} onChange={e=>set("platform",e.target.value)} placeholder="Google Maps"/></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <SBtn onClick={onClose}>Annulla</SBtn>
        <PBtn onClick={()=>onSave(r)}>Salva</PBtn>
      </div>
    </div>
  </div>;
}

const DEF=()=>({id:uid(),name:"",city:"",tone:"amichevole",focus:"",templateDataUrl:null,viDataUrl:null,viFileName:null,viBase64:null,viMime:null,selectedTypes:["quiz","curiosita","mito_verita","consiglio"],brandFont:"Montserrat",brandColors:["#2d6a2d","#7bc67b"],bgIsLight:true,clientInfo:null,clientNotes:""});

function ClientForm({init,onSave,onCancel}){
  const [f,setF]=useState(()=>init?{...init,clientNotes:init.clientNotes||""}:DEF());
  const [analyzing,setAnalyzing]=useState(false);
  const [msg,setMsg]=useState("");
  const [siteUrl,setSiteUrl]=useState("");
  const [fetchingUrl,setFetchingUrl]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const handleTpl=async e=>{const file=e.target.files[0];if(!file)return;const url=await toUrl(file);set("templateDataUrl",url);const cols=await extractColors(url);set("brandColors",cols);};
  const handleVI=async e=>{const file=e.target.files[0];if(!file)return;set("viDataUrl",await toUrl(file));set("viFileName",file.name);set("viBase64",await toB64(file));set("viMime",file.type);};
  const handleFetchUrl=async()=>{
    const url=siteUrl.trim();if(!url)return;
    setFetchingUrl(true);setMsg("Scarico il sito...");
    try{
      const text=await fetchSiteContent(url);
      if(!text){setMsg("Sito non raggiungibile.");setFetchingUrl(false);return;}
      set("clientNotes",text);
      setFetchingUrl(false);setAnalyzing(true);setMsg("Elaboro info...");
      const info=await analyzeClientText(text);
      if(info&&!info.error){
        set("clientInfo",info);
        if(info.name)set("name",info.name);
        if(info.city)set("city",info.city);
        if(info.focus)set("focus",info.focus);
        if(info.tone)set("tone",info.tone);
        setMsg("Info estratte dal sito!");
      }else setMsg("Sito scaricato, compila i campi manualmente.");
      setAnalyzing(false);setTimeout(()=>setMsg(""),5000);
    }catch(e){setMsg("Errore nel caricamento del sito.");setFetchingUrl(false);setAnalyzing(false);}
  };
  const toggleType=t=>set("selectedTypes",f.selectedTypes.includes(t)?f.selectedTypes.filter(x=>x!==t):[...f.selectedTypes,t]);
  const ff="'"+(f.brandFont||"Montserrat")+"',sans-serif";
  return <div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{background:"var(--surface)",borderRadius:16,padding:16,border:"1px solid var(--line)"}}>
      <Lbl c="Info Cliente (opzionale)"/>
      <div style={{fontSize:11,color:M,marginBottom:10}}>Incolla il link del sito — l'AI compila automaticamente nome, città, servizi e tono</div>
      <div style={{display:"flex",gap:8}}>
        <input value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleFetchUrl()} placeholder="https://www.studiofisio.it" style={{flex:1,background:"rgba(85,70,151,0.04)",border:GLASS_BD,borderRadius:12,padding:"9px 14px",color:T,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
        <PBtn onClick={handleFetchUrl} disabled={fetchingUrl||analyzing||!siteUrl.trim()} sx={{fontSize:12,padding:"9px 14px",whiteSpace:"nowrap"}}>{fetchingUrl?"Scarico...":(analyzing?"Elaboro...":"Importa sito")}</PBtn>
      </div>
      {msg&&<div style={{fontSize:11,color:msg.startsWith("Info")?ACC:"#ffaa44",marginTop:8,fontFamily:"monospace"}}>{msg}</div>}
      {f.clientInfo&&!f.clientInfo.error&&<div style={{marginTop:10,padding:"10px 12px",background:"rgba(85,70,151,0.05)",borderRadius:8,border:GLASS_BD}}>
        <div style={{fontSize:11,color:ACC,fontWeight:700,marginBottom:4}}>Strutturato</div>
        <div style={{fontSize:11,color:T,lineHeight:1.7}}>{f.clientInfo.description}</div>
        {f.clientInfo.services&&f.clientInfo.services.length>0&&<div style={{fontSize:10,color:M,marginTop:4}}>{f.clientInfo.services.join("   ")}</div>}
      </div>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div><Lbl c="Nome Studio"/><Inp value={f.name} onChange={e=>set("name",e.target.value)} placeholder="es. Studio Rossi"/></div>
      <div><Lbl c="Citta"/><Inp value={f.city} onChange={e=>set("city",e.target.value)} placeholder="es. Milano"/></div>
    </div>
    <div><Lbl c="Focus (opzionale)"/><Inp value={f.focus} onChange={e=>set("focus",e.target.value)} placeholder="es. postura, atleti, mal di schiena"/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <UpZone label="Template 9:16" accept="image/png,image/jpeg" value={f.templateDataUrl} preview onChange={handleTpl} hint="Estrae colori brand"/>
      <UpZone label="Visual Identity PDF" accept="application/pdf,.pdf" value={f.viDataUrl} preview={false} onChange={handleVI} hint="Brand guide"/>
    </div>
    <div>
      <Lbl c="Colori Brand"/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        {(f.brandColors||[]).map((c,i)=><div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="color" value={c} onChange={e=>{const n=[...f.brandColors];n[i]=e.target.value;set("brandColors",n);}} style={{width:34,height:34,borderRadius:8,border:GLASS_BD,background:"none",cursor:"pointer",padding:2}}/>
          <input value={c} onChange={e=>{const n=[...f.brandColors];n[i]=e.target.value;set("brandColors",n);}} style={{width:80,background:"rgba(85,70,151,0.04)",border:GLASS_BD,borderRadius:8,padding:"4px 8px",color:T,fontSize:11,outline:"none",fontFamily:"monospace"}}/>
        </div>)}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div><Lbl c="Font Brand"/><Sel value={f.brandFont} onChange={e=>set("brandFont",e.target.value)}>{GFONTS.map(ft=><option key={ft} value={ft}>{ft}</option>)}</Sel></div>
      <div><Lbl c="Sfondo"/><div style={{display:"flex",gap:7,marginTop:4}}><Chip sel={f.bgIsLight!==false} onClick={()=>set("bgIsLight",true)}>Chiaro</Chip><Chip sel={f.bgIsLight===false} onClick={()=>set("bgIsLight",false)}>Scuro</Chip></div></div>
    </div>
    <div style={{background:"rgba(85,70,151,0.03)",borderRadius:10,padding:"14px 18px",border:GLASS_BD}}>
      <link rel="stylesheet" href={"https://fonts.googleapis.com/css2?family="+encodeURIComponent(f.brandFont||"Montserrat")+":wght@400;700;900&display=swap"}/>
      <div style={{fontSize:9,color:M,fontFamily:"monospace",marginBottom:8}}>ANTEPRIMA</div>
      <div style={{fontFamily:ff,fontSize:20,color:(f.brandColors&&f.brandColors[0])||"#2d6a2d",fontWeight:900}}>Headline - Titolo Storia</div>
      <div style={{fontFamily:ff,fontSize:13,color:(f.brandColors&&f.brandColors[1])||"#7bc67b",marginTop:6}}>Testo corpo - colore secondario brand</div>
    </div>
    <div><Lbl c="Tono"/><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{TONES.map(([id,lb])=><Chip key={id} sel={f.tone===id} onClick={()=>set("tone",id)}>{lb}</Chip>)}</div></div>
    <div><Lbl c="Tipologie (quiz = 2 card)"/><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{STORY_TYPES.map(t=><Chip key={t.id} sel={(f.selectedTypes||[]).includes(t.id)} onClick={()=>toggleType(t.id)}>{t.emoji} {t.label}</Chip>)}</div></div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      {onCancel&&<SBtn onClick={onCancel}>Annulla</SBtn>}
      <PBtn disabled={!f.name.trim()} onClick={()=>onSave({...f})}>Salva</PBtn>
    </div>
  </div>;
}

function StoryItem({story,client,onRegen,idx,onZoom,withPhotos}){
  const [jpg,setJpg]=useState(null);const [rend,setRend]=useState(false);
  const render=useCallback(async()=>{
    setRend(true);
    try{
      await ensureFont(client.brandFont||"Montserrat");
      let pi=null;
      const np=withPhotos&&(TYPES_WITH_PHOTO.includes(story.type)||TYPES_WITH_PHOTO.includes(story.cardType));
      console.log('[StoryItem] story',idx,'np:',np,'photoQuery:',story.photoQuery,'type:',story.type,'cardType:',story.cardType);
      if(np&&story.photoQuery){
        const u=await fetchPhoto(story.photoQuery,client.id);
        if(u){
          pi=await loadImg(u);
          console.log('[StoryItem] story',idx,'loadImg result:',pi?'✅ image loaded':'❌ loadImg returned null (CORS?)');
        }
      } else if(!np){
        console.log('[StoryItem] story',idx,'⏭️ skipping photo: type not in TYPES_WITH_PHOTO or withPhotos=false');
      } else if(!story.photoQuery){
        console.log('[StoryItem] story',idx,'⏭️ skipping photo: LLM returned null/empty photoQuery');
      }
      setJpg(await renderJpeg(story,client,pi));
    }catch(e){console.error(e);}
    setRend(false);
  },[story,client,withPhotos]);
  useEffect(()=>{render();},[render]);
  const dl=()=>{if(!jpg)return;const a=document.createElement("a");a.href=jpg;a.download="storia_"+(client.name||"f").replace(/\s/g,"_")+"_"+(idx+1)+".jpg";a.click();};
  return <div style={{background:S,borderRadius:14,overflow:"hidden",border:GLASS_BD,transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=ACC+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(85,70,151,0.10)"}>
    <div style={{aspectRatio:"9/16",background:"#ddd",position:"relative",overflow:"hidden",cursor:jpg?"zoom-in":"default"}} onClick={()=>jpg&&onZoom(jpg)}>
      {rend&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,background:"#0a0a0a"}}><div style={{width:26,height:26,border:"3px solid "+ACC+"33",borderTop:"3px solid "+ACC,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:9,color:M,fontFamily:"monospace"}}>render</span></div>}
      {jpg&&!rend&&<img src={jpg} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>}
      {jpg&&!rend&&<div style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.4)",borderRadius:6,padding:"2px 6px",fontSize:9,color:"#fff"}}>zoom</div>}
    </div>
    <div style={{padding:"9px 11px",display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontSize:10,color:ACC,fontWeight:700,fontFamily:"monospace"}}>{story.emoji} {story.typeLabel}</div>
      <div style={{fontSize:11,color:T,lineHeight:1.4,fontWeight:600}}>{(story.headline||"").slice(0,50)}{(story.headline||"").length>50?"...":""}</div>
      <div style={{display:"flex",gap:5,marginTop:4}}>
        <button onClick={()=>onRegen(idx)} style={{flex:1,background:"rgba(85,70,151,0.04)",border:GLASS_BD,borderRadius:7,color:M,fontSize:10,padding:"5px",cursor:"pointer"}}>regen</button>
        <button onClick={dl} disabled={!jpg} style={{flex:2,background:jpg?"rgba(85,70,151,0.10)":"rgba(85,70,151,0.04)",border:`1px solid ${jpg?"rgba(255,255,255,0.35)":"rgba(85,70,151,0.10)"}`,borderRadius:7,color:jpg?ACC:M,fontSize:10,padding:"5px",cursor:jpg?"pointer":"not-allowed",fontWeight:700}}>JPG</button>
      </div>
    </div>
  </div>;
}

function groupReviews(reviews){
  // Short reviews (<180 chars) get grouped 2-3 per card, long ones alone
  const SHORT=180,MED=400;
  const groups=[];
  let i=0;
  while(i<reviews.length){
    const r=reviews[i];
    const len=(r.text||"").length;
    if(len<SHORT&&i+2<reviews.length&&(reviews[i+1].text||"").length<SHORT&&(reviews[i+2].text||"").length<SHORT){
      groups.push([r,reviews[i+1],reviews[i+2]]);i+=3;
    } else if(len<MED&&i+1<reviews.length&&(reviews[i+1].text||"").length<MED){
      groups.push([r,reviews[i+1]]);i+=2;
    } else {
      groups.push(r);i++;
    }
  }
  return groups;
}

function ReviewCard({review,client,idx,onZoom,onEdit,titleColor,textColor,authorColor}){
  const [jpg,setJpg]=useState(null);const [rend,setRend]=useState(false);
  const render=useCallback(async()=>{
    setRend(true);
    try{
      await ensureFont(client.brandFont||"Montserrat");
      setJpg(await renderReviewJpeg(review,client,{titleColor,textColor,authorColor}));
    }catch(e){console.error(e);}
    setRend(false);
  },[review,client,titleColor,textColor,authorColor]);
  useEffect(()=>{render();},[render]);
  const dl=()=>{if(!jpg)return;const a=document.createElement("a");a.href=jpg;a.download="rec_"+(client.name||"f").replace(/\s/g,"_")+"_"+(idx+1)+".jpg";a.click();};
  return <div style={{background:S,borderRadius:14,overflow:"hidden",border:GLASS_BD,transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=ACC+"55"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(85,70,151,0.10)"}>
    <div style={{aspectRatio:"9/16",background:"#dde8dd",position:"relative",overflow:"hidden",cursor:jpg?"zoom-in":"default"}} onClick={()=>jpg&&onZoom(jpg)}>
      {rend&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,background:"#0a0a0a"}}><div style={{width:26,height:26,border:"3px solid "+ACC+"33",borderTop:"3px solid "+ACC,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:9,color:M,fontFamily:"monospace"}}>render</span></div>}
      {jpg&&!rend&&<img src={jpg} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>}
      <div style={{position:"absolute",top:6,left:6,background:ACC+"cc",borderRadius:6,padding:"2px 8px",fontSize:9,color:"#062020",fontWeight:700}}>rec</div>
    </div>
    <div style={{padding:"9px 11px",display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontSize:11,color:ACC,fontWeight:700}}>{"★".repeat(Array.isArray(review)?review[0].stars||5:review.stars||5)} {Array.isArray(review)?review.length+" recensioni":review.name}</div>
      <div style={{fontSize:10,color:M,lineHeight:1.4}}>{(Array.isArray(review)?review[0].text:review.text||"").slice(0,60)}...</div>
      <div style={{display:"flex",gap:5,marginTop:4}}>
        <button onClick={()=>onEdit(idx)} style={{flex:1,background:"rgba(85,70,151,0.04)",border:GLASS_BD,borderRadius:7,color:M,fontSize:10,padding:"5px",cursor:"pointer"}}>edit</button>
        <button onClick={dl} disabled={!jpg} style={{flex:2,background:jpg?"rgba(85,70,151,0.10)":"rgba(85,70,151,0.04)",border:`1px solid ${jpg?"rgba(255,255,255,0.35)":"rgba(85,70,151,0.10)"}`,borderRadius:7,color:jpg?ACC:M,fontSize:10,padding:"5px",cursor:jpg?"pointer":"not-allowed",fontWeight:700}}>JPG</button>
      </div>
    </div>
  </div>;
}

export default function StoriesApp({ client: clientProp }){
  const genClient = clientProp;
  const [mode,setMode]=useState("content");
  const [stories,setStories]=useState([]);
  const { templates: savedTemplates, addTemplateFromFile, removeTemplate, busy: templatesBusy } = useStoryTemplates();
  const { batches: storyBatches, saveBatch, deleteBatch, reload: reloadBatches } = useStoryBatches();
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [scheduleItems,setScheduleItems]=useState([]);
  const [preparingSchedule,setPreparingSchedule]=useState(false);
  const [qty,setQty]=useState(12);
  const [types,setTypes]=useState([...(clientProp?.selectedTypes||["quiz","curiosita","consiglio","sapevi_che"])]);
  const [withPhotos,setWithPhotos]=useState(true);
  const [loading,setLoading]=useState(false);
  const [genMsg,setGenMsg]=useState("");
  const [err,setErr]=useState("");
  const [reviews,setReviews]=useState([]);
  const [manualText,setManualText]=useState("");
  const [rLoading,setRLoading]=useState(false);
  const [rMsg,setRMsg]=useState("");
  const [rErr,setRErr]=useState("");
  const [gmapsUrl,setGmapsUrl]=useState("");
  const [gmapsLoading,setGmapsLoading]=useState(false);
  const [editRIdx,setEditRIdx]=useState(null);
  const [zoomJpg,setZoomJpg]=useState(null);
  const fileRevRef=useRef();
  const bc=genClient?.brandColors||[];
  const [revTitleColor,setRevTitleColor]=useState(bc[0]||"#2d6a2d");
  const [revTextColor,setRevTextColor]=useState("#2a2a2a");
  const [revAuthorColor,setRevAuthorColor]=useState(bc[0]||"#2d6a2d");
  const [extractingVI,setExtractingVI]=useState(false);
  // Template state
  // Single uploaded template applies to BOTH storie and recensioni
  const [storyTemplate,setStoryTemplate]=useState(genClient?.templateDataUrl||null);
  const [reviewTemplate,setReviewTemplate]=useState(null);

  const sharedTemplate = storyTemplate || reviewTemplate || genClient?.templateDataUrl || null;
  const storyClient = {...(genClient||{}), templateDataUrl: storyTemplate || sharedTemplate, bgIsLight: true};
  const reviewClient = {...(genClient||{}), templateDataUrl: reviewTemplate || sharedTemplate, bgIsLight: true};
  const templateFileRef=useRef();

  const handleTemplateUpload=(_type,e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onloadend=()=>{
      // Unified template: applies to both storie and recensioni
      setStoryTemplate(reader.result);
      setReviewTemplate(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const generate=async()=>{
    if(!genClient)return;setLoading(true);setErr("");setGenMsg("Generazione...");
    try{
      const l=await generateStories(genClient,qty,types||genClient.selectedTypes);
      setStories(l);
      // Persist batch (non-blocking)
      saveBatch('topic', { qty, types, label: (genClient.name||'') + ' — ' + qty + ' storie' }, l);
    }
    catch(e){setErr("Errore. Riprova.");console.error(e);}
    setLoading(false);setGenMsg("");
  };
  const regenOne=async idx=>{
    const s=stories[idx];
    try{
      const raw=await callAI([{role:"user",content:'Una storia "'+s.typeLabel+'" per '+genClient.name+'. SOLO JSON:\n{"type":"'+s.type+'","cardType":"'+(s.cardType||"normal")+'","typeLabel":"'+s.typeLabel+'","emoji":"...","headline":"...","text":"...","photoQuery":"..."}'}],500);
      setStories(p=>p.map((x,i)=>i===idx?JSON.parse(raw.split("```json").join("").split("```").join("").trim()):x));
    }catch(e){console.error(e);}
  };
  const handleSchedule=async()=>{
    if(!stories.length)return;
    setPreparingSchedule(true);
    setGenMsg("Preparo anteprime...");
    try{
      await ensureFont(genClient.brandFont||"Montserrat");
      const items=[];
      for(let i=0;i<stories.length;i++){
        setGenMsg("Anteprima "+(i+1)+"/"+stories.length+"...");
        let pi=null;
        const np=withPhotos&&(TYPES_WITH_PHOTO.includes(stories[i].type)||TYPES_WITH_PHOTO.includes(stories[i].cardType));
        if(np&&stories[i].photoQuery){const u=await fetchPhoto(stories[i].photoQuery,genClient?.id);if(u)pi=await loadImg(u);}
        const dataUrl=await renderJpeg(stories[i],storyClient,pi);
        items.push({
          id:String(i),
          render:()=>Promise.resolve(dataUrl),
          thumbnailDataUrl:dataUrl,
          title:stories[i].headline||stories[i].typeLabel||("Storia "+(i+1)),
        });
      }
      setScheduleItems(items);
      setScheduleOpen(true);
    }catch(e){
      console.error("schedule prepare error",e);
      setErr("Errore preparazione anteprime");
    }
    setGenMsg("");
    setPreparingSchedule(false);
  };
  const dlAll=async()=>{
    if(!stories.length)return;
    setGenMsg("Genero immagini...");
    try{
      const JSZip=await loadJSZip();
      const zip=new JSZip();
      const folder=zip.folder("storie_"+(genClient.name||"studio").replace(/\s/g,"_"));
      for(let i=0;i<stories.length;i++){
        setGenMsg("Rendering "+(i+1)+"/"+stories.length+"...");
        let pi=null;
        await ensureFont(genClient.brandFont||"Montserrat");
      const np=withPhotos&&(TYPES_WITH_PHOTO.includes(stories[i].type)||TYPES_WITH_PHOTO.includes(stories[i].cardType));
        if(np&&stories[i].photoQuery){const u=await fetchPhoto(stories[i].photoQuery,genClient?.id);if(u)pi=await loadImg(u);}
        const dataUrl=await renderJpeg(stories[i],storyClient,pi);
        const b64=dataUrl.split(",")[1];
        folder.file("storia_"+(i+1)+".jpg",b64,{base64:true});
      }
      setGenMsg("Creo ZIP...");
      const blob=await zip.generateAsync({type:"blob"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download="storie_"+(genClient.name||"studio").replace(/\s/g,"_")+".zip";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setGenMsg(stories.length+" storie scaricate!");
    }catch(e){
      console.error(e);setGenMsg("Errore download");
    }
    setTimeout(()=>setGenMsg(""),4000);
  };;
  const parseManual=async()=>{
    if(!manualText.trim())return;setRLoading(true);setRMsg("Elaboro...");setRErr("");
    try{
      const r=await parseManualText(manualText);
      if(Array.isArray(r)&&r.length>0){
        setReviews(r);setRMsg(r.length+" recensioni!");
        saveBatch('manual', { label: r.length+' recensioni manuali' }, r);
      }
      else setRErr("Nessuna recensione trovata nel testo.");
    }catch(e){setRErr("Errore parsing. Controlla il testo.");console.error(e);}
    setRLoading(false);setTimeout(()=>setRMsg(""),5000);
  };
  const handleGmapsScrape=async()=>{
    const url=gmapsUrl.trim();if(!url)return;
    setGmapsLoading(true);setRLoading(true);setRMsg("Scarico recensioni da Google Maps (può richiedere 1-3 min)...");setRErr("");
    try{
      const { data, error: fnErr } = await supabase.functions.invoke('scrape-reviews', { body: { url } });
      if(fnErr)throw new Error(fnErr.message||'Errore scraping');
      if(data?.error)throw new Error(data.error);
      if(data.reviews&&data.reviews.length>0){
        setReviews(data.reviews);setRMsg(data.reviews.length+" recensioni trovate su Google Maps!");
        saveBatch('reviews', { url, label: data.reviews.length+' recensioni da Google Maps' }, data.reviews);
      }
      else setRErr("Nessuna recensione trovata per questo link.");
    }catch(e){setRErr("Errore: "+e.message);console.error("[gmaps scrape]",e);}
    setGmapsLoading(false);setRLoading(false);setTimeout(()=>setRMsg(""),8000);
  };
  const handleFileReview=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    setRLoading(true);setRMsg("Leggo "+file.name+"...");setRErr("");
    try{
      const r=await parseFileReviews(file);
      if(Array.isArray(r)&&r.length>0){
        setReviews(r);setRMsg(r.length+" recensioni da "+file.name+"!");
        saveBatch('file', { label: r.length+' recensioni da '+file.name, fileName: file.name }, r);
      }
      else setRErr("Nessuna recensione trovata nel file.");
    }catch(e){setRErr("Errore: "+e.message);console.error("[parseFileReviews]",e);}
    setRLoading(false);setTimeout(()=>setRMsg(""),5000);
    e.target.value="";
  };
  const handleExtractVI=async()=>{
    setExtractingVI(true);
    const res=await extractColorsFromVI(genClient.viBase64,genClient.viMime,genClient.brandColors);
    if(res.titleColor)setRevTitleColor(res.titleColor);
    if(res.textColor)setRevTextColor(res.textColor||"#2a2a2a");
    if(res.authorColor)setRevAuthorColor(res.authorColor);
    setExtractingVI(false);
  };
  const dlAllRev=async()=>{
    if(!reviews.length)return;
    setRMsg("Genero immagini...");
    try{
      const JSZip=await loadJSZip();
      const zip=new JSZip();
      const folder=zip.folder("recensioni_"+(genClient.name||"studio").replace(/\s/g,"_"));
      const groups=groupReviews(reviews);
      for(let i=0;i<groups.length;i++){
        setRMsg("Rendering "+(i+1)+"/"+groups.length+"...");
        await ensureFont(genClient.brandFont||"Montserrat");
        const dataUrl=await renderReviewJpeg(groups[i],reviewClient,{titleColor:revTitleColor,textColor:revTextColor,authorColor:revAuthorColor});
        // dataUrl = "data:image/jpeg;base64,..."
        const b64=dataUrl.split(",")[1];
        folder.file("rec_"+(i+1)+".jpg", b64, {base64:true});
      }
      setRMsg("Creo ZIP...");
      const blob=await zip.generateAsync({type:"blob"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download="recensioni_"+(genClient.name||"studio").replace(/\s/g,"_")+".zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRMsg(groups.length+" storie scaricate!");
    }catch(e){
      console.error(e);
      setRMsg("Errore download");
    }
    setTimeout(()=>setRMsg(""),4000);
  };

  return <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--ink)",fontFamily:"Montserrat,sans-serif",position:"relative"}}>
    <style>{`
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes orb{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.08) translate(20px,-20px)}}
      *{box-sizing:border-box}
      ::selection{background:rgba(255,255,255,0.18)}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-track{background:#000}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
      input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.22)!important}
      input:focus,textarea:focus,select:focus{border-color:rgba(85,70,151,0.15)!important;box-shadow:0 0 0 3px rgba(85,70,151,0.03)!important}
      .glass-card{background:rgba(85,70,151,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(85,70,151,0.08);border-radius:20px}
      .btn-primary:hover:not(:disabled){background:#e8e8e8!important;transform:translateY(-1px)}
      .btn-secondary:hover{background:rgba(85,70,151,0.08)!important;border-color:rgba(85,70,151,0.15)!important}
      .client-card:hover{border-color:rgba(255,255,255,0.2)!important;transform:translateY(-2px)}
      .client-card{transition:transform .2s ease,border-color .2s ease}
    `}</style>
    {/* Background orbs */}
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-15%",left:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(85,70,151,0.03) 0%,transparent 65%)",animation:"orb 12s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"-10%",right:"-8%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(85,70,151,0.03) 0%,transparent 65%)",animation:"orb 16s ease-in-out infinite reverse"}}/>
      <div style={{position:"absolute",top:"40%",right:"20%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 65%)",animation:"orb 20s ease-in-out infinite 4s"}}/>
    </div>
    <ZoomModal jpg={zoomJpg} onClose={()=>setZoomJpg(null)}/>
    {editRIdx!==null&&<ReviewEditModal review={reviews[editRIdx]} onSave={r=>{setReviews(p=>p.map((x,i)=>i===editRIdx?r:x));setEditRIdx(null);}} onClose={()=>setEditRIdx(null)}/>}

    <div style={{maxWidth:980,margin:"0 auto",padding:"28px 16px 80px"}}>

      {genClient&&<div style={{animation:"fadeSlideUp .4s ease"}}>
        <div style={{display:"flex",gap:0,marginBottom:22,borderBottom:"1.5px solid var(--line)"}}>
          {[
            {id:"content",label:"Storie"+(stories.length>0?" ("+stories.length+")":"")},
            {id:"reviews",label:"Recensioni"+(reviews.length>0?" ("+reviews.length+")":"")},
            {id:"templates",label:"Template"},
            {id:"history",label:"Storico"+(storyBatches.length>0?" ("+storyBatches.length+")":"")},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setMode(tab.id)} style={{flex:1,padding:"10px 16px",border:"none",borderBottom:mode===tab.id?"2px solid var(--rosa)":"2px solid transparent",background:"transparent",color:mode===tab.id?"var(--ink)":"var(--ink3)",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"Montserrat,sans-serif",textTransform:"uppercase",letterSpacing:"0.6px",transition:"all .2s"}}>
              {tab.label}
            </button>
          ))}
        </div>

        {mode==="content"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20,background:"var(--surface)",borderRadius:14,padding:"16px",border:"1px solid var(--line)"}}>
            <div>
              <Lbl c={"Numero Storie: "+qty}/>
              <input type="range" min={6} max={30} step={6} value={qty} onChange={e=>setQty(+e.target.value)} style={{width:"100%",accentColor:"var(--rosa)"}}/>
              <div style={{fontSize:10,color:"var(--ink3)",marginTop:5,fontFamily:"Montserrat,sans-serif"}}>I quiz generano 2 storie ciascuno</div>
            </div>
            <div>
              <Lbl c="Tipologie"/>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {STORY_TYPES.map(t=>{
                  const ts=types||genClient.selectedTypes;
                  const sel=ts.includes(t.id);
                  return <Chip key={t.id} sel={sel} onClick={()=>{const cur=types?[...types]:[...genClient.selectedTypes];setTypes(sel?cur.filter(x=>x!==t.id):[...cur,t.id]);}}>{t.emoji} {t.label}</Chip>;
                })}
              </div>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <Lbl c="Immagini di sfondo"/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Chip sel={withPhotos} onClick={()=>setWithPhotos(true)}>📷 Con foto (dove c'è testo lungo)</Chip>
                <Chip sel={!withPhotos} onClick={()=>setWithPhotos(false)}>✕ Solo grafica</Chip>
              </div>
              <div style={{fontSize:10,color:"var(--ink3)",marginTop:5,fontFamily:"Montserrat,sans-serif"}}>Le foto appaiono solo nelle storie con testo, mai sui quiz</div>
            </div>
          </div>
          {err&&<div style={{color:"#FF6B6B",fontSize:12,marginBottom:14,padding:"10px 14px",background:"#FF6B6B08",borderRadius:10}}>{err}</div>}
          <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>
            <PBtn sx={{flex:1,padding:"14px",fontSize:14,minWidth:200}} disabled={loading} onClick={generate}>{loading?"Generazione...":"Genera le Storie"}</PBtn>
            {stories.length>0&&<SBtn sx={{padding:"14px 20px"}} onClick={dlAll} disabled={!!genMsg||preparingSchedule}>{genMsg&&!preparingSchedule?"...":"Scarica Tutte"}</SBtn>}
            {stories.length>0&&<button onClick={handleSchedule} disabled={!!genMsg||preparingSchedule} style={{padding:"14px 20px",borderRadius:12,border:"none",cursor:preparingSchedule?"wait":"pointer",background:"linear-gradient(135deg, var(--viola) 0%, var(--rosa) 100%)",color:"#fff",fontSize:13,fontWeight:800,letterSpacing:"0.5px",textTransform:"uppercase",boxShadow:"0 4px 12px rgba(230,0,126,0.25)",opacity:(!!genMsg||preparingSchedule)?0.6:1}}>{preparingSchedule?"Preparo...":"⏰ Programma"}</button>}
          </div>
          {stories.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:12}}>
            {stories.map((s,i)=><StoryItem key={i+"-"+(s.headline||"")+(s.cardType||"")} story={s} client={storyClient} onRegen={regenOne} idx={i} onZoom={setZoomJpg} withPhotos={withPhotos}/>)}
          </div>}
        </div>}

        {mode==="reviews"&&<div>
          <div style={{background:S,borderRadius:14,padding:"16px 18px",border:GLASS_BD,marginBottom:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:10,color:M,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>Colori Storia Recensioni</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {genClient.brandColors&&<div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:9,color:M,fontFamily:"monospace"}}>brand:</span>
                  {genClient.brandColors.slice(0,5).map((col,i)=><div key={i} title={"Click per usare "+col} onClick={()=>{setRevTitleColor(col);setRevAuthorColor(col);}} style={{width:18,height:18,borderRadius:"50%",background:col,border:"2px solid "+(revTitleColor===col?"#fff":"#444"),cursor:"pointer",transition:"border .15s"}}/>)}
                </div>}
                <PBtn onClick={handleExtractVI} disabled={extractingVI} sx={{fontSize:10,padding:"5px 10px"}}>
                  {extractingVI?"Estraggo...":genClient.viBase64?"* Estrai dalla VI":"* Da brand colors"}
                </PBtn>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {label:"Titolo",val:revTitleColor||"#2d6a2d",set:setRevTitleColor,reset:()=>setRevTitleColor(genClient.brandColors?.[0]||"#2d6a2d")},
                {label:"Testo",val:revTextColor||"#2a2a2a",set:setRevTextColor,reset:()=>setRevTextColor("#2a2a2a")},
                {label:"Autore",val:revAuthorColor||"#2d6a2d",set:setRevAuthorColor,reset:()=>setRevAuthorColor(genClient.brandColors?.[0]||"#2d6a2d")},
              ].map(({label,val,set,reset})=>(
                <div key={label} style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:9,color:M,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <input type="color" value={val} onChange={e=>set(e.target.value)}
                      style={{width:32,height:32,borderRadius:8,border:"2px solid "+val,background:"none",cursor:"pointer",padding:1,flexShrink:0}}/>
                    <input value={val} onChange={e=>set(e.target.value)}
                      style={{flex:1,background:"rgba(85,70,151,0.03)",border:GLASS_BD,borderRadius:6,padding:"4px 6px",color:T,fontSize:10,outline:"none",fontFamily:"monospace",minWidth:0}}/>
                  </div>
                  <button onClick={reset} style={{fontSize:9,color:M,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0,fontFamily:"monospace",opacity:0.7}}>{"← reset brand"}</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:S,borderRadius:14,padding:"18px",border:GLASS_BD,marginBottom:14,display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <Lbl c="Importa da Google Maps"/>
              <div style={{fontSize:11,color:M,marginBottom:8}}>Incolla il link Google Maps del centro — scarica automaticamente tutte le recensioni</div>
              <div style={{display:"flex",gap:8}}>
                <input value={gmapsUrl} onChange={e=>setGmapsUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleGmapsScrape()} placeholder="https://www.google.com/maps/place/..." style={{flex:1,background:"rgba(85,70,151,0.04)",border:GLASS_BD,borderRadius:12,padding:"9px 14px",color:T,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                <PBtn onClick={handleGmapsScrape} disabled={gmapsLoading||!gmapsUrl.trim()} sx={{fontSize:12,padding:"9px 14px",whiteSpace:"nowrap"}}>{gmapsLoading?"Scarico...":"Importa Recensioni"}</PBtn>
              </div>
            </div>
          </div>
          <div style={{background:S,borderRadius:14,padding:"18px",border:GLASS_BD,marginBottom:20,display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <Lbl c="Carica File Recensioni"/>
              <div style={{fontSize:11,color:M,marginBottom:8}}>PDF, TXT, CSV, XLSX esportato come testo - l'AI estrae tutte le recensioni automaticamente</div>
              <div onClick={()=>fileRevRef.current.click()} style={{border:"1.5px dashed rgba(255,255,255,0.2)",borderRadius:10,padding:"14px",background:"rgba(85,70,151,0.03)",cursor:"pointer",textAlign:"center",display:"flex",gap:10,alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:20}}>📎</span>
                <span style={{fontSize:12,color:M}}>{rLoading?"Elaboro...":"Clicca per caricare PDF / TXT / CSV / XLSX"}</span>
              </div>
              <input ref={fileRevRef} type="file" accept=".pdf,.txt,.csv,.xlsx,.xls" style={{display:"none"}} onChange={handleFileReview}/>
            </div>
            <div style={{borderTop:GLASS_BD,paddingTop:14}}>
              <Lbl c="Oppure incolla testo"/>
              <div style={{fontSize:11,color:M,marginBottom:8}}>Copia da Google Maps o da qualsiasi fonte e incolla qui</div>
              <textarea value={manualText} onChange={e=>setManualText(e.target.value)} placeholder={"Mario Rossi 5 stelle\nOttimo studio, personale professionale...\n\nGiulia Bianchi 5 stelle\nConsiglio vivamente..."} style={{width:"100%",background:"rgba(85,70,151,0.03)",border:GLASS_BD,borderRadius:10,padding:"10px 13px",color:T,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",minHeight:100}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                <div style={{fontSize:11,color:rMsg?ACC:rErr?"#ffaa44":M,fontFamily:"monospace"}}>{rMsg||rErr||""}</div>
                <PBtn onClick={parseManual} disabled={rLoading||!manualText.trim()} sx={{fontSize:12,padding:"9px 16px"}}>{rLoading?"Elaboro...":"Elabora"}</PBtn>
              </div>
            </div>
          </div>
          {reviews.length>0&&<div>
            <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center"}}>
              <div style={{flex:1,fontSize:12,color:M,fontFamily:"monospace"}}>{reviews.length} recensioni</div>
              <SBtn onClick={dlAllRev} sx={{padding:"9px 16px"}}>Scarica Tutte</SBtn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:12}}>
              {(()=>{const g=groupReviews(reviews);return g.map((rv,i)=><ReviewCard key={i+(Array.isArray(rv)?rv[0].name:rv.name||"")} review={rv} client={reviewClient} idx={i} onZoom={setZoomJpg} onEdit={()=>setEditRIdx(reviews.indexOf(Array.isArray(rv)?rv[0]:rv))} titleColor={revTitleColor} textColor={revTextColor} authorColor={revAuthorColor}/>);})()}
            </div>
          </div>}
        </div>}

        {/* ── Tab: Template (unico per storie + recensioni) ── */}
        {mode==="templates"&&<div style={{animation:"fadeSlideUp .4s ease"}}>
          <div style={{maxWidth:720,margin:"0 auto",background:"var(--surface)",borderRadius:16,padding:20,border:"1px solid var(--line)"}}>
            <Lbl c="Template Sfondo"/>
            <p style={{fontSize:11,color:"var(--ink3)",marginBottom:14,fontFamily:"Montserrat,sans-serif"}}>
              Sfondo 9:16 usato sia per storie sia per card recensioni.
            </p>
            {storyTemplate?(
              <div style={{position:"relative",marginBottom:14}}>
                <img src={storyTemplate} alt="Template attivo" style={{width:"100%",maxHeight:380,objectFit:"contain",borderRadius:12,border:"1px solid var(--line)"}}/>
                <button onClick={()=>{setStoryTemplate(null);setReviewTemplate(null);}} style={{position:"absolute",top:8,right:8,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.5)",border:"none",color:"#fff",fontSize:14,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
            ):(
              <div onClick={()=>templateFileRef.current?.click()} style={{border:"2px dashed var(--line)",borderRadius:12,padding:30,textAlign:"center",cursor:"pointer",marginBottom:14,background:"var(--bg)"}}>
                <span style={{fontSize:28,opacity:0.3,display:"block",marginBottom:6}}>↑</span>
                <span style={{fontSize:11,color:"var(--ink3)",fontFamily:"Montserrat,sans-serif"}}>Carica immagine 9:16 personalizzata</span>
              </div>
            )}
            <input ref={templateFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleTemplateUpload("story",e)}/>
          </div>

          <div style={{maxWidth:720,margin:"16px auto 0",padding:12,borderRadius:10,background:"var(--viola-dim)",border:"1px solid rgba(85,70,151,0.1)"}}>
            <p style={{fontSize:11,color:"var(--ink2)",fontFamily:"Montserrat,sans-serif"}}>
              Carica un'immagine 9:16 personalizzata da usare come sfondo per storie e card recensioni.
            </p>
          </div>
        </div>}

        {mode==="history"&&<div style={{animation:"fadeSlideUp .4s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"var(--ink)"}}>Storico generazioni</div>
              <div style={{fontSize:11,color:"var(--ink3)",marginTop:2}}>Le storie e recensioni generate per il brand attivo. Click per ricaricarle.</div>
            </div>
            <button onClick={reloadBatches} style={{fontSize:11,fontWeight:700,color:"var(--rosa)",background:"transparent",border:"1px solid var(--rosa)",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>↻ Aggiorna</button>
          </div>
          {storyBatches.length===0?(
            <div style={{padding:"40px 20px",textAlign:"center",background:"var(--surface)",borderRadius:14,border:"1px solid var(--line)"}}>
              <div style={{fontSize:32,opacity:0.3,marginBottom:8}}>📚</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>Nessuna generazione salvata</div>
              <div style={{fontSize:11,color:"var(--ink3)",marginTop:4}}>Genera storie o carica recensioni: il batch verrà salvato automaticamente qui.</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {storyBatches.map(b=>{
                const date=new Date(b.created_at);
                const isStories=b.source_type==="topic";
                const sourceColor=isStories?"#3b82f6":(b.source_type==="reviews"?"#10b981":(b.source_type==="manual"?"#f59e0b":"#8b5cf6"));
                const sourceLabel=isStories?"Storie":(b.source_type==="reviews"?"Recensioni Google":(b.source_type==="manual"?"Recensioni manuali":"Recensioni da file"));
                const reload=()=>{
                  if(isStories){setStories(b.stories||[]);setMode("content");}
                  else{setReviews(b.stories||[]);setMode("reviews");}
                };
                return(
                  <div key={b.id} style={{background:"var(--surface)",border:"1px solid var(--line)",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:42,height:42,borderRadius:10,background:sourceColor+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>
                      {isStories?"📖":"⭐"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:10,fontWeight:800,color:sourceColor,letterSpacing:"0.5px",textTransform:"uppercase"}}>{sourceLabel}</span>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--ink)"}}>{b.story_count} {isStories?"storie":"recensioni"}</span>
                        <span style={{fontSize:10,color:"var(--ink3)",fontFamily:"monospace"}}>{date.toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"})}</span>
                      </div>
                      <div style={{fontSize:12,color:"var(--ink2)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {b.source_meta?.label || (b.source_meta?.url ? b.source_meta.url : "Batch #"+b.id.substring(0,8))}
                      </div>
                    </div>
                    <button onClick={reload} style={{padding:"7px 14px",fontSize:11,fontWeight:700,background:"var(--rosa)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",letterSpacing:"0.4px"}}>
                      ↻ Ricarica
                    </button>
                    <button onClick={()=>{if(confirm("Eliminare questo batch?"))deleteBatch(b.id);}} style={{padding:"7px 10px",fontSize:11,fontWeight:700,background:"transparent",color:"#ef4444",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,cursor:"pointer"}}>
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>}

      </div>}

    </div>
    {scheduleOpen && (
      <ScheduleStoriesDialog
        open={scheduleOpen}
        onClose={()=>setScheduleOpen(false)}
        stories={scheduleItems||[]}
      />
    )}
  </div>;
}

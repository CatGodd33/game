import {useState} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {DEFAULT_GAME_CONFIG,aliasSchema} from "@life-duel/shared";
import {api} from "../services/api";
import {useSessionStore} from "../features/session/sessionStore";
import {useDemographics} from "../hooks/useDemographics";
import {safeErrorMessage} from "../lib/utils";
export function DuelPage(){
 const navigate=useNavigate(),[params]=useSearchParams();
 const ensure=useSessionStore(s=>s.ensureSession),lastAlias=useSessionStore(s=>s.lastAlias);
 const {data}=useDemographics();
 const [mode,setMode]=useState<"create"|"join">(params.get("modo")==="unirse"||params.get("codigo")?"join":"create");
 const [alias,setAlias]=useState(lastAlias??""),[code,setCode]=useState(params.get("codigo")??""),[country,setCountry]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(){
  const parsed=aliasSchema.safeParse(alias);if(!parsed.success){setError("Escribe tu nombre para entrar en la sala.");return;}
  setBusy(true);setError("");
  try{await ensure(parsed.data);const result=mode==="create"?await api.createRoom({alias:parsed.data,config:{...DEFAULT_GAME_CONFIG,storyMode:true,monthlyMode:true,autoDecisions:false,decisionTimerSeconds:0,countryMode:country?"fixed":"random",fixedCountry:country||undefined}}):await api.joinRoom({alias:parsed.data,code:code.toUpperCase().trim()});navigate(`/sala/${result.lobby.code}`);}catch(e){setError(safeErrorMessage(e));}finally{setBusy(false);}
 }
 return <main className="duel-page"><Link className="duel-back" to="/">← Volver al inicio</Link><header className="duel-intro"><span className="duel-kicker">Un mismo comienzo · dos historias</span><h1>La vida se juega<br/>a tu manera.</h1><p>Compartís nacimiento y recursos iniciales. Después, cada persona vive a su ritmo. La puntuación decide cuando ambas vidas terminan.</p></header>
 <div className="duel-entry-layout"><section className="duel-entry-card"><div className="duel-tabs"><button aria-pressed={mode==="create"} onClick={()=>{setMode("create");setError("");}}>Crear sala</button><button aria-pressed={mode==="join"} onClick={()=>{setMode("join");setError("");}}>Unirme con código</button></div><h2>{mode==="create"?"Invita a una persona":"Tu sitio en la sala"}</h2><label>Tu nombre<input aria-label="Tu alias" value={alias} maxLength={18} onChange={e=>setAlias(e.target.value)} placeholder="Cómo quieres aparecer" autoComplete="nickname"/></label>
 {mode==="join"?<label>Código de sala<input className="room-code-input" aria-label="Código de sala" value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} placeholder="ABC234" autoComplete="off"/></label>:<label>El punto de partida<select aria-label="País de nacimiento compartido" value={country} onChange={e=>setCountry(e.target.value)}><option value="">Un lugar al azar en el mundo</option>{data?.countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>}
 {error&&<p className="duel-form-error" role="alert">{error}</p>}<button className="duel-main-button" disabled={busy||(mode==="join"&&code.length!==6)} onClick={()=>void submit()}>{busy?"Preparando…":mode==="create"?"Crear sala privada":"Entrar en la sala"}</button><p className="duel-form-note">Dos participantes. Sin cronómetro para responder.</p></section>
 <aside className="duel-how"><h2>Un duelo sin prisas</h2><ol><li><span>01</span><div><strong>El mismo nacimiento</strong><p>País, familia y recursos iguales para empezar.</p></div></li><li><span>02</span><div><strong>Tu reloj y tus decisiones</strong><p>Pausa, explora y responde sin esperar al otro jugador.</p></div></li><li><span>03</span><div><strong>Un resultado al final</strong><p>Dinero, bienestar, salud, aprendizaje y relaciones cuentan.</p></div></li></ol><small>La infancia tiene protección adicional en este modo para reducir finales prematuros.</small></aside></div></main>;
}

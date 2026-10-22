import { Link } from "react-router-dom";
import type {GameView} from "@life-duel/shared";
export function DuelWaiting({game}:{game:GameView}){
 const c=game.me.character;
 return <main className="duel-waiting"><span className="duel-kicker">Tu historia ha terminado · sala {game.roomCode}</span><h1>Una vida, tus decisiones.</h1><p>{c.ageAtDeath??c.age} años · {c.causeOfDeath??"Vida completada"}</p><div className="duel-result-score"><strong>{game.me.score.total.toFixed(1)}</strong><span>puntos acumulados</span></div><p>{game.duel?.opponentAlias} continúa su vida. Tu resultado está guardado; compararemos las dos puntuaciones cuando termine.</p><div className="duel-wait-facts"><span>Saldo <b>${Math.round(c.finance.money).toLocaleString("es")} PPP</b></span><span>Felicidad <b>{Math.round(c.stats.happiness)}/100</b></span><span>Familia <b>{c.children} hijos</b></span></div><Link className="story-button primary" to={`/partida/${game.id}/historial`}>Recordar mi vida</Link><Link className="story-button" to="/partidas">Volver más tarde</Link></main>;
}

// Forge — règles et modèle
import * as E from '../engine.js';
import { CFG, Table, pc } from './base.jsx';

// ---------- règles ----------
const dec = (x) => String(x).replace('.', ',');

export function Rules({ onBack, net }) {
  return (
    <div className="page narrow rules">
      <div className="page-head"><h1>Règles et modèle</h1>{onBack && <button className="btn btn-ghost" onClick={onBack}>Retour</button>}</div>
      <div className="panel">
        <h2>Déroulement</h2>
        <p>Chaque tour représente un trimestre. {net ? "Chaque équipe saisit ses décisions sur son propre poste, connectée avec son code d'accès ; l'animateur suit en direct qui a validé." : "Les équipes saisissent leurs décisions l'une après l'autre sur le même poste, derrière un écran de confidentialité."} L'animateur résout ensuite le trimestre : toutes les décisions sont appliquées simultanément sur un marché commun. Chaque équipe consulte alors son rapport (synthèse et diagnostic, production, marché, finances, historique) avant de préparer le trimestre suivant.</p>
        <p>Le classement porte par défaut sur le <b>rendement total pour l'actionnaire (TSR)</b> : variation du cours de l'action depuis le départ, dividendes cumulés inclus. L'animateur peut lui préférer un <b>score pondéré</b> combinant TSR, climat social, qualité livrée, taux de service et ROCE : chaque critère est ramené entre la moins bonne équipe (0) et la meilleure (100), puis pondéré. Les montants sont en k€, sauf les prix unitaires en €.</p>
      </div>
      <div className="panel">
        <h2>Marché</h2>
        <p>Deux segments. Le <b>Standard</b> (≈ 6 200 unités par équipe et par trimestre au départ, +{pc(CFG.growth.S)} par trimestre) est sensible au prix. Le <b>Premium</b> (≈ 1 700 unités, +{pc(CFG.growth.P)} par trimestre) est sensible à la technologie et à la réputation. La demande suit une saisonnalité (T1 0,96 ; T2 1,04 ; T3 0,92 ; T4 1,08) et un cycle conjoncturel.</p>
        <p>La part de marché de chaque offre est proportionnelle à son attractivité :</p>
        <pre className="formula">attractivité = présence × (prix / prix de référence)^−ε × (1 + notoriété / 600)^α × (réputation / 60)^β × e^(γ · avance technologique saturée) × (0,85 + 0,15 × taux de service précédent)</pre>
        <Table head={['Paramètre', 'Standard', 'Premium']} rows={[
          { cells: ['Élasticité-prix ε', '2,2', '1,7'] }, { cells: ['Effet notoriété α', '0,25', '0,30'] }, { cells: ['Effet réputation β', '0,4', '1,0'] }, { cells: [`Effet technologie γ (saturé à ±${CFG.techSat} points)`, dec(CFG.techGamma.S), dec(CFG.techGamma.P)] },
        ]} />
        <p>La notoriété s'accumule : notoriété = 0,65 × notoriété précédente + budget marketing. La technologie progresse avec la R&D à rendements décroissants (≈ 2 × √(budget / 150) points par trimestre) ; les retardataires rattrapent 8 % de leur écart par imitation. Une offre en rupture perd ses ventes : la moitié de la demande non servie se reporte sur les concurrents qui ont du stock. Les concurrents non joueurs ajustent leurs prix à leurs stocks.</p>
      </div>
      <div className="panel">
        <h2>Production</h2>
        <p>Une ligne produit 1 600 équivalents Standard par équipe et par trimestre à pleine efficacité ; un Premium consomme 2,4 éq. de temps machine et 2,2 kits de composants. Chaque ligne demande 15 opérateurs par équipe (1×8, 2×8 ou 3×8).</p>
        <pre className="formula">TRS = disponibilité × performance × qualité
disponibilité = 0,70 + 0,28 × état du parc / 100   (pannes, grèves en sus)
performance = (0,80 + 0,20 × compétences / 100) × (0,9 + 0,2 × climat / 100)</pre>
        <p>La production réelle est le plan, réduit par le plus contraignant de trois goulots : capacité machine, main-d'œuvre (heures supplémentaires jusqu'à +10 %), kits disponibles. L'état du parc s'use avec le nombre d'équipes et l'âge des lignes ; la maintenance le restaure. Les nouvelles lignes entrent en service au trimestre suivant leur achat.</p>
      </div>
      <div className="panel">
        <h2>Qualité, achats, ressources humaines</h2>
        <p>Le taux de défauts dépend de la qualité des composants (fournisseurs A, B, C), des compétences, de l'état du parc, de l'équipe de nuit et de la certification. Le contrôle qualité intercepte une part des défauts (rebuts) ; les défauts non interceptés partent chez le client et coûtent en garantie, en réputation et en risque de rappel. Les fournisseurs diffèrent par le prix, la fiabilité de livraison et la qualité ; la couverture fige l'indice des composants pendant 4 trimestres.</p>
        <p>Le climat social dépend du salaire relatif, des compétences, de l'équipe de nuit et des licenciements. Il pèse sur la productivité, les départs volontaires et le risque de grève. La formation entretient les compétences ; les recrues arrivent moins qualifiées.</p>
      </div>
      <div className="panel">
        <h2>Finance et valorisation</h2>
        <p>Les clients paient un tiers du chiffre d'affaires au trimestre suivant, et l'entreprise paie un tiers de ses achats de composants au trimestre suivant. La dette est à taux variable : taux directeur + prime selon le levier (dette nette / EBITDA annuel). L'emprunt est plafonné à 3,5 × l'EBITDA annuel. Un découvert est toléré jusqu'à 35 % du chiffre d'affaires trimestriel ; au-delà, la banque impose un crédit d'urgence et une surveillance de 4 trimestres (dividendes bloqués, prime majorée). L'impôt est de 25 % avec report des déficits.</p>
        <pre className="formula">valeur des fonds propres = multiple × (EBITDA annuel + 0,4 × R&D annuelle) − dette nette
multiple = 6 + 10 × croissance du CA sur un an (bornée) + effets réputation et technologie, borné entre 3 et 11</pre>
        <p>La R&D est partiellement réintégrée : les investisseurs la traitent en partie comme un investissement.</p>
      </div>
      <div className="panel">
        <h2>Événements et opportunités</h2>
        <p>Chocs macroéconomiques possibles : flambée des matières premières, crise de l'énergie, récession ou reprise, pénurie de composants, mouvement des taux, tension salariale, nouvelle norme Premium (les offres non certifiées perdent 20 % d'attractivité). Incidents propres à chaque entreprise, dont la probabilité dépend de ses décisions : panne (état du parc), grève (climat), accident (compétences, nuit), rappel produit (défauts livrés), départ d'un ingénieur clé (climat).</p>
        <p><b>Appels d'offres</b> : un volume à livrer au trimestre suivant ; l'offre la moins chère sous le plafond l'emporte, avec un avantage pour la réputation et la certification. <b>Croissance externe</b> : trois concurrents, un fournisseur et une start-up sont mis en vente au fil de la partie, par enchères sous pli scellé au-dessus d'un prix plancher. Le rachat entre équipes n'est pas possible.</p>
      </div>
      <div className="panel">
        <h2>Entreprises pilotées par l'IA</h2>
        <p>L'animateur peut confier une ou plusieurs entreprises à l'IA, à la création de la partie ou en cours de route. Elles partent de la même situation que les équipes, obéissent aux mêmes règles, concourent au même classement et sont signalées par la mention <span className="ai-tag">IA</span>. Leurs décisions sont calculées au moment de la résolution, à partir des mêmes informations que celles d'une équipe ; elles ne voient pas les décisions des autres.</p>
        <Table head={['Profil', 'Niveau', 'Comportement']} rows={Object.entries(E.AI_PROFILES).map(([k, p]) => ({ cells: [p.label, p.level, p.desc] }))} />
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
export default function QuoteFunnelSteps({step}:{step:"A"|"B"|"C"}){
 return <nav className="qf-steps" aria-label="Your quote progress"><ol>{[["A","Get your estimate"],["B","Request your quote"],["C","What happens next"]].map(([letter,label])=><li key={letter} aria-current={step===letter?"step":undefined}><span>{letter}</span>{letter==="A"&&step!=="A"?<Link to="/quote">{label}</Link>:<strong>{label}</strong>}</li>)}</ol></nav>;
}

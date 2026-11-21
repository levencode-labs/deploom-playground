'use strict';
(() => {
  function rating(entry) {
    const label = String(entry.database_specific?.severity || (typeof entry.severity==='string'?entry.severity:'')).toUpperCase();
    const published = {CRITICAL:'Critical',HIGH:'High',MODERATE:'Medium',MEDIUM:'Medium',LOW:'Low',NONE:'None'}[label];
    const scores = [];
    for (const s of Array.isArray(entry.severity) ? entry.severity : []) {
      const value = String(s?.score ?? '');
      if (/^(?:10(?:\.0)?|[0-9](?:\.\d)?)$/.test(value)) scores.push(Number(value));
      else if (/^CVSS:3\.[01]\//.test(value)) {
        const m = Object.fromEntries(value.split('/').slice(1).map(part => part.split(':')));
        const changed = m.S==='C';
        if (!changed && m.S!=='U') continue;
        const impactValue = {H:0.56,L:0.22,N:0};
        const isc = 1-(1-impactValue[m.C])*(1-impactValue[m.I])*(1-impactValue[m.A]);
        const impact = changed ? 7.52*(isc-.029)-3.25*(isc-.02)**15 : 6.42*isc;
        const expl = 8.22*({N:.85,A:.62,L:.55,P:.2}[m.AV])*({L:.77,H:.44}[m.AC])*
          ({N:.85,L:changed?.68:.62,H:changed?.5:.27}[m.PR])*({N:.85,R:.62}[m.UI]);
        if (Number.isFinite(impact) && Number.isFinite(expl)) {
          const raw = impact<=0 ? 0 : Math.min(10,(changed?1.08:1)*(impact+expl));
          scores.push(Math.ceil(Math.round(raw*100000)/10000)/10);
        }
      }
    }
    const value=entry.cvss?.score;
    if (typeof value==='number' && value>=0 && value<=10) scores.push(value);
    const score=scores.length ? Math.max(...scores) : null;
    const level=published || (score===null?'Unknown':score>=9?'Critical':score>=7?'High':score>=4?'Medium':score>0?'Low':'None');
    return {level,score};
  }
  function sorted(entries) {
    const order = {Critical:0,High:1,Medium:2,Low:3,None:4,Unknown:5};
    return [...entries].sort((a,b) => order[a.level]-order[b.level] || (b.score??-1)-(a.score??-1) || a.id.localeCompare(b.id));
  }
  function badge({level,score}) {
    const tag=document.createElement('strong');
    tag.className='severity-tag sev-'+level.toLowerCase();
    tag.textContent=(level==='Unknown'?window.Lab.t('Нет оценки','Unrated'):level)+(score==null?'':' · '+score.toFixed(1));return tag;
  }
  const api = {rating,sorted,badge};
  if (typeof module==='object' && module.exports) module.exports=api;
  else window.LabSeverity=api;
})();

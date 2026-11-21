'use strict';
(() => {
  const url='audit-data/osv-npm-v1.json';
  const object=x=>x!==null && typeof x==='object' && !Array.isArray(x);
  const known=new WeakSet();
  let cached;
  const now=()=>Math.floor(Date.now()/1000);
  const seconds=x=>Number.isSafeInteger(x) && x>0 && x<8640000000000;

  async function load(signal) {
    signal?.throwIfAborted();
    if(cached && cached.published<=now() && now()<cached.expires)return cached;
    const options={method:'GET',mode:'same-origin',credentials:'same-origin',redirect:'error',referrerPolicy:'no-referrer',cache:'no-cache',signal};
    let response=await fetch(url,options);
    let compressed=false;
    if(response.status===404) {
      response=await fetch(url+'.gz',options);
      compressed=true;
    }
    if(!response.ok)throw Error('HOSTED_SNAPSHOT');
    let index;
    if(compressed) {
      // Static hosts can serve an archive or send Content-Encoding and let the browser unpack it.
      const blob=await response.blob();
      const magic=new Uint8Array(await blob.slice(0,2).arrayBuffer());
      const body=magic[0]===0x1f && magic[1]===0x8b
        ? blob.stream().pipeThrough(new DecompressionStream('gzip')) : blob.stream();
      // Decode incrementally; buffering the whole uncompressed byte stream again adds a large peak.
      const reader=body.getReader(), decoder=new TextDecoder('utf-8',{fatal:true});
      let json='';
      while(true) {
        const {value,done}=await reader.read();
        if(done)break;
        json+=decoder.decode(value,{stream:true});
      }
      index=JSON.parse(json+decoder.decode());
    } else {
      index=await response.json();
    }
    if(!object(index) || index.schema!==1 || index.source!=='OSV' || index.coverage!=='npm-ecosystem' ||
      index.ecosystem!=='npm' || !seconds(index.published) || !seconds(index.expires) ||
      index.expires<=index.published || index.published>now() || !Number.isSafeInteger(index.rows) ||
      index.rows<1 || !object(index.packages))throw Error('HOSTED_SNAPSHOT');
    let rows=0;
    for(const entries of Object.values(index.packages)) {
      if(!Array.isArray(entries) || !entries.length)throw Error('HOSTED_SNAPSHOT');
      rows+=entries.length;
    }
    if(rows!==index.rows)throw Error('HOSTED_SNAPSHOT');
    signal?.throwIfAborted();
    Object.defineProperty(index,'fresh',{get:()=>index.published<=now() && now()<index.expires});
    known.add(index);cached=index;return index;
  }
  // OSV compares prerelease versions by precedence, including a prerelease before a stable fix.
  const less=(a,b)=>treeSemver.satisfies(a,'<'+b,{includePrerelease:true});
  function affectedByRange(range,target) {
    if(!object(range) || !['SEMVER','ECOSYSTEM'].includes(range.type) || !Array.isArray(range.events))return null;
    let introduction=false, limited=false, beforeLimit=false, fixed=false, last=false;
    const sequence=[];
    for(const event of range.events) {
      if(!object(event) || Object.keys(event).length!==1)return null;
      const [type]=Object.keys(event), raw=event[type];
      if(!['introduced','fixed','last_affected','limit'].includes(type) || typeof raw!=='string')return null;
      if(type==='introduced')introduction=true;
      if(type==='limit' && raw==='*'){limited=true;beforeLimit=true;continue;}
      const first=type==='introduced' && raw==='0';
      const version=first?null:treeSemver.valid(raw);
      if(!first && !version)return null;
      if(type==='limit'){limited=true;beforeLimit ||= less(target,version);continue;}
      fixed ||= type==='fixed';last ||= type==='last_affected';
      sequence.push({type,version});
    }
    if(!introduction || fixed && last)return null;
    if(limited && !beforeLimit)return false;
    sequence.sort((a,b)=>{
      if(a.version===b.version)return Number(a.type!=='introduced')-Number(b.type!=='introduced');
      if(a.version===null)return -1;
      if(b.version===null)return 1;
      return less(a.version,b.version)?-1:1;
    });
    let affected=false;
    for(let i=0;i<sequence.length;i++){
      const {type,version}=sequence[i];
      if(i && version===sequence[i-1].version && type!==sequence[i-1].type && (type==='fixed' || sequence[i-1].type==='fixed'))return null;
      if(version===null){affected=true;continue;}
      if(type==='last_affected') {if(less(version,target))affected=false;}
      else if(!less(target,version))affected=type==='introduced';
    }
    return affected;
  }
  function match(record,version) {
    const versions=record.versions, ranges=record.ranges;
    if(Array.isArray(versions) && versions.includes(version))return true;
    let unknown=!Array.isArray(versions) || !Array.isArray(ranges) || versions.some(v=>typeof v!=='string');
    if(Array.isArray(ranges)) for(const range of ranges) {
      const result=affectedByRange(range,version);
      if(result===true)return true;
      if(result===null)unknown=true;
    }
    return unknown || !versions.length && !ranges.length ? null : false;
  }
  function findingDetails(index, entry) {
    const catalog = index.advisories;
    const details = object(catalog) && Object.hasOwn(catalog,entry.id) && object(catalog[entry.id])
      ? catalog[entry.id] : {};
    const text = key => typeof details[key] === 'string' ? details[key] : typeof entry[key] === 'string' ? entry[key] : '';
    const aliases = Array.isArray(details.aliases) ? details.aliases : entry.aliases;
    return {
      id: entry.id,
      source: 'OSV',
      href: 'https://osv.dev/vulnerability/' + encodeURIComponent(entry.id),
      summary: text('summary').slice(0,1200),
      published: text('published'),
      modified: text('modified'),
      aliases: Array.isArray(aliases) ? aliases.filter(alias => typeof alias === 'string') : [],
      ...LabSeverity.rating({severity: entry.severity}),
    };
  }
  function check(index,rows,records,signal) {
    if(!known.has(index))throw Error('HOSTED_SNAPSHOT');
    const {t}=Lab;
    for(const row of rows) {
      signal?.throwIfAborted();
      row.ids=[];row.state='unknown';row.lookedUp=false;delete row.reason;
      if(row.localOnly || typeof row.name!=='string' || !row.name || typeof row.version!=='string' || !treeSemver.valid(row.version)) {
        row.reason=t('Нужны имя и точная версия пакета npm.','An npm package name and exact registry version are required.');continue;
      }
      const entries=Object.hasOwn(index.packages,row.name)?index.packages[row.name]:[];
      const matched=new Set(), unresolved=new Set();
      for(const entry of entries) {
        if(!object(entry) || typeof entry.id!=='string' || !/^[a-zA-Z0-9][a-zA-Z0-9.:_-]{0,159}$/.test(entry.id)) {
          unresolved.add(null);continue;
        }
        const result=match(entry,row.version);
        if(result===null){unresolved.add(entry.id);continue;}
        if(!result)continue;
        matched.add(entry.id);
        const finding=findingDetails(index,entry);
        const prior=records.get(entry.id);
        records.set(entry.id,prior?LabSeverity.sorted([prior,finding])[0]:finding);
      }
      for(const id of matched)unresolved.delete(id);
      row.ids=[...matched];
      row.lookedUp=index.fresh;
      if(!index.fresh)row.reason=t('Срок действия снимка OSV истёк.','The OSV snapshot has expired.');
      else if(unresolved.size)row.reason=t('Для части записей OSV не удалось проверить диапазон версий.','Some OSV version ranges could not be evaluated.');
      else if(matched.size)row.state='found';
      else if(row.publicOrigin===true)row.state='empty';
      else row.reason=t('В публичном снимке нет совпадения. Происхождение пакета не подтверждено.','The public snapshot returned no match. The package’s public identity is unconfirmed.');
    }
  }
  window.LabHostedAudit={load,check};
})();

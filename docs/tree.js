/* npm semver v7.8.1
The ISC License

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
var treeSemver=(()=>{var ke=Object.create;var P=Object.defineProperty;var We=Object.getOwnPropertyDescriptor;var Be=Object.getOwnPropertyNames;var Me=Object.getPrototypeOf,Ye=Object.prototype.hasOwnProperty;var $=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports),ze=(r,e)=>{for(var t in e)P(r,t,{get:e[t],enumerable:!0})},B=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Be(e))!Ye.call(r,i)&&i!==t&&P(r,i,{get:()=>e[i],enumerable:!(s=We(e,i))||s.enumerable});return r};var q=(r,e,t)=>(t=r!=null?ke(Me(r)):{},B(e||!r||!r.__esModule?P(t,"default",{value:r,enumerable:!0}):t,r)),Ke=r=>B(P({},"__esModule",{value:!0}),r);var d=$((Rr,M)=>{"use strict";var Ze=typeof process=="object"&&process.env&&process.env.NODE_DEBUG&&/\bsemver\b/i.test(process.env.NODE_DEBUG)?(...r)=>console.error("SEMVER",...r):()=>{};M.exports=Ze});var w=$((Ir,Y)=>{"use strict";var Je="2.0.0",Qe=Number.MAX_SAFE_INTEGER||9007199254740991,et=16,tt=256-6,rt=["major","premajor","minor","preminor","patch","prepatch","prerelease"];Y.exports={MAX_LENGTH:256,MAX_SAFE_COMPONENT_LENGTH:et,MAX_SAFE_BUILD_LENGTH:tt,MAX_SAFE_INTEGER:Qe,RELEASE_TYPES:rt,SEMVER_SPEC_VERSION:Je,FLAG_INCLUDE_PRERELEASE:1,FLAG_LOOSE:2}});var C=$((O,z)=>{"use strict";var{MAX_SAFE_COMPONENT_LENGTH:x,MAX_SAFE_BUILD_LENGTH:st,MAX_LENGTH:it}=w(),nt=d();O=z.exports={};var at=O.re=[],Et=O.safeRe=[],n=O.src=[],lt=O.safeSrc=[],a=O.t={},ot=0,y="[a-zA-Z0-9-]",ct=[["\\s",1],["\\d",it],[y,st]],ht=r=>{for(let[e,t]of ct)r=r.split(`${e}*`).join(`${e}{0,${t}}`).split(`${e}+`).join(`${e}{1,${t}}`);return r},l=(r,e,t)=>{let s=ht(e),i=ot++;nt(r,i,e),a[r]=i,n[i]=e,lt[i]=s,at[i]=new RegExp(e,t?"g":void 0),Et[i]=new RegExp(s,t?"g":void 0)};l("NUMERICIDENTIFIER","0|[1-9]\\d*");l("NUMERICIDENTIFIERLOOSE","\\d+");l("NONNUMERICIDENTIFIER",`\\d*[a-zA-Z-]${y}*`);l("MAINVERSION",`(${n[a.NUMERICIDENTIFIER]})\\.(${n[a.NUMERICIDENTIFIER]})\\.(${n[a.NUMERICIDENTIFIER]})`);l("MAINVERSIONLOOSE",`(${n[a.NUMERICIDENTIFIERLOOSE]})\\.(${n[a.NUMERICIDENTIFIERLOOSE]})\\.(${n[a.NUMERICIDENTIFIERLOOSE]})`);l("PRERELEASEIDENTIFIER",`(?:${n[a.NONNUMERICIDENTIFIER]}|${n[a.NUMERICIDENTIFIER]})`);l("PRERELEASEIDENTIFIERLOOSE",`(?:${n[a.NONNUMERICIDENTIFIER]}|${n[a.NUMERICIDENTIFIERLOOSE]})`);l("PRERELEASE",`(?:-(${n[a.PRERELEASEIDENTIFIER]}(?:\\.${n[a.PRERELEASEIDENTIFIER]})*))`);l("PRERELEASELOOSE",`(?:-?(${n[a.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${n[a.PRERELEASEIDENTIFIERLOOSE]})*))`);l("BUILDIDENTIFIER",`${y}+`);l("BUILD",`(?:\\+(${n[a.BUILDIDENTIFIER]}(?:\\.${n[a.BUILDIDENTIFIER]})*))`);l("FULLPLAIN",`v?${n[a.MAINVERSION]}${n[a.PRERELEASE]}?${n[a.BUILD]}?`);l("FULL",`^${n[a.FULLPLAIN]}$`);l("LOOSEPLAIN",`[v=\\s]*${n[a.MAINVERSIONLOOSE]}${n[a.PRERELEASELOOSE]}?${n[a.BUILD]}?`);l("LOOSE",`^${n[a.LOOSEPLAIN]}$`);l("GTLT","((?:<|>)?=?)");l("XRANGEIDENTIFIERLOOSE",`${n[a.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);l("XRANGEIDENTIFIER",`${n[a.NUMERICIDENTIFIER]}|x|X|\\*`);l("XRANGEPLAIN",`[v=\\s]*(${n[a.XRANGEIDENTIFIER]})(?:\\.(${n[a.XRANGEIDENTIFIER]})(?:\\.(${n[a.XRANGEIDENTIFIER]})(?:${n[a.PRERELEASE]})?${n[a.BUILD]}?)?)?`);l("XRANGEPLAINLOOSE",`[v=\\s]*(${n[a.XRANGEIDENTIFIERLOOSE]})(?:\\.(${n[a.XRANGEIDENTIFIERLOOSE]})(?:\\.(${n[a.XRANGEIDENTIFIERLOOSE]})(?:${n[a.PRERELEASELOOSE]})?${n[a.BUILD]}?)?)?`);l("XRANGE",`^${n[a.GTLT]}\\s*${n[a.XRANGEPLAIN]}$`);l("XRANGELOOSE",`^${n[a.GTLT]}\\s*${n[a.XRANGEPLAINLOOSE]}$`);l("COERCEPLAIN",`(^|[^\\d])(\\d{1,${x}})(?:\\.(\\d{1,${x}}))?(?:\\.(\\d{1,${x}}))?`);l("COERCE",`${n[a.COERCEPLAIN]}(?:$|[^\\d])`);l("COERCEFULL",n[a.COERCEPLAIN]+`(?:${n[a.PRERELEASE]})?(?:${n[a.BUILD]})?(?:$|[^\\d])`);l("COERCERTL",n[a.COERCE],!0);l("COERCERTLFULL",n[a.COERCEFULL],!0);l("LONETILDE","(?:~>?)");l("TILDETRIM",`(\\s*)${n[a.LONETILDE]}\\s+`,!0);O.tildeTrimReplace="$1~";l("TILDE",`^${n[a.LONETILDE]}${n[a.XRANGEPLAIN]}$`);l("TILDELOOSE",`^${n[a.LONETILDE]}${n[a.XRANGEPLAINLOOSE]}$`);l("LONECARET","(?:\\^)");l("CARETTRIM",`(\\s*)${n[a.LONECARET]}\\s+`,!0);O.caretTrimReplace="$1^";l("CARET",`^${n[a.LONECARET]}${n[a.XRANGEPLAIN]}$`);l("CARETLOOSE",`^${n[a.LONECARET]}${n[a.XRANGEPLAINLOOSE]}$`);l("COMPARATORLOOSE",`^${n[a.GTLT]}\\s*(${n[a.LOOSEPLAIN]})$|^$`);l("COMPARATOR",`^${n[a.GTLT]}\\s*(${n[a.FULLPLAIN]})$|^$`);l("COMPARATORTRIM",`(\\s*)${n[a.GTLT]}\\s*(${n[a.LOOSEPLAIN]}|${n[a.XRANGEPLAIN]})`,!0);O.comparatorTrimReplace="$1$2$3";l("HYPHENRANGE",`^\\s*(${n[a.XRANGEPLAIN]})\\s+-\\s+(${n[a.XRANGEPLAIN]})\\s*$`);l("HYPHENRANGELOOSE",`^\\s*(${n[a.XRANGEPLAINLOOSE]})\\s+-\\s+(${n[a.XRANGEPLAINLOOSE]})\\s*$`);l("STAR","(<|>)?=?\\s*\\*");l("GTE0","^\\s*>=\\s*0\\.0\\.0\\s*$");l("GTE0PRE","^\\s*>=\\s*0\\.0\\.0-0\\s*$")});var D=$((pr,K)=>{"use strict";var ut=Object.freeze({loose:!0}),ft=Object.freeze({}),$t=r=>r?typeof r!="object"?ut:r:ft;K.exports=$t});var ee=$((Lr,Q)=>{"use strict";var Z=/^[0-9]+$/,J=(r,e)=>{if(typeof r=="number"&&typeof e=="number")return r===e?0:r<e?-1:1;let t=Z.test(r),s=Z.test(e);return t&&s&&(r=+r,e=+e),r===e?0:t&&!s?-1:s&&!t?1:r<e?-1:1},Rt=(r,e)=>J(e,r);Q.exports={compareIdentifiers:J,rcompareIdentifiers:Rt}});var S=$((Nr,re)=>{"use strict";var G=d(),{MAX_LENGTH:te,MAX_SAFE_INTEGER:v}=w(),{safeRe:g,t:F}=C(),It=D(),{compareIdentifiers:U}=ee(),j=class r{constructor(e,t){if(t=It(t),e instanceof r){if(e.loose===!!t.loose&&e.includePrerelease===!!t.includePrerelease)return e;e=e.version}else if(typeof e!="string")throw new TypeError(`Invalid version. Must be a string. Got type "${typeof e}".`);if(e.length>te)throw new TypeError(`version is longer than ${te} characters`);G("SemVer",e,t),this.options=t,this.loose=!!t.loose,this.includePrerelease=!!t.includePrerelease;let s=e.trim().match(t.loose?g[F.LOOSE]:g[F.FULL]);if(!s)throw new TypeError(`Invalid Version: ${e}`);if(this.raw=e,this.major=+s[1],this.minor=+s[2],this.patch=+s[3],this.major>v||this.major<0)throw new TypeError("Invalid major version");if(this.minor>v||this.minor<0)throw new TypeError("Invalid minor version");if(this.patch>v||this.patch<0)throw new TypeError("Invalid patch version");s[4]?this.prerelease=s[4].split(".").map(i=>{if(/^[0-9]+$/.test(i)){let E=+i;if(E>=0&&E<v)return E}return i}):this.prerelease=[],this.build=s[5]?s[5].split("."):[],this.format()}format(){return this.version=`${this.major}.${this.minor}.${this.patch}`,this.prerelease.length&&(this.version+=`-${this.prerelease.join(".")}`),this.version}toString(){return this.version}compare(e){if(G("SemVer.compare",this.version,this.options,e),!(e instanceof r)){if(typeof e=="string"&&e===this.version)return 0;e=new r(e,this.options)}return e.version===this.version?0:this.compareMain(e)||this.comparePre(e)}compareMain(e){return e instanceof r||(e=new r(e,this.options)),this.major<e.major?-1:this.major>e.major?1:this.minor<e.minor?-1:this.minor>e.minor?1:this.patch<e.patch?-1:this.patch>e.patch?1:0}comparePre(e){if(e instanceof r||(e=new r(e,this.options)),this.prerelease.length&&!e.prerelease.length)return-1;if(!this.prerelease.length&&e.prerelease.length)return 1;if(!this.prerelease.length&&!e.prerelease.length)return 0;let t=0;do{let s=this.prerelease[t],i=e.prerelease[t];if(G("prerelease compare",t,s,i),s===void 0&&i===void 0)return 0;if(i===void 0)return 1;if(s===void 0)return-1;if(s===i)continue;return U(s,i)}while(++t)}compareBuild(e){e instanceof r||(e=new r(e,this.options));let t=0;do{let s=this.build[t],i=e.build[t];if(G("build compare",t,s,i),s===void 0&&i===void 0)return 0;if(i===void 0)return 1;if(s===void 0)return-1;if(s===i)continue;return U(s,i)}while(++t)}inc(e,t,s){if(e.startsWith("pre")){if(!t&&s===!1)throw new Error("invalid increment argument: identifier is empty");if(t){let i=`-${t}`.match(this.options.loose?g[F.PRERELEASELOOSE]:g[F.PRERELEASE]);if(!i||i[1]!==t)throw new Error(`invalid identifier: ${t}`)}}switch(e){case"premajor":this.prerelease.length=0,this.patch=0,this.minor=0,this.major++,this.inc("pre",t,s);break;case"preminor":this.prerelease.length=0,this.patch=0,this.minor++,this.inc("pre",t,s);break;case"prepatch":this.prerelease.length=0,this.inc("patch",t,s),this.inc("pre",t,s);break;case"prerelease":this.prerelease.length===0&&this.inc("patch",t,s),this.inc("pre",t,s);break;case"release":if(this.prerelease.length===0)throw new Error(`version ${this.raw} is not a prerelease`);this.prerelease.length=0;break;case"major":(this.minor!==0||this.patch!==0||this.prerelease.length===0)&&this.major++,this.minor=0,this.patch=0,this.prerelease=[];break;case"minor":(this.patch!==0||this.prerelease.length===0)&&this.minor++,this.patch=0,this.prerelease=[];break;case"patch":this.prerelease.length===0&&this.patch++,this.prerelease=[];break;case"pre":{let i=Number(s)?1:0;if(this.prerelease.length===0)this.prerelease=[i];else{let E=this.prerelease.length;for(;--E>=0;)typeof this.prerelease[E]=="number"&&(this.prerelease[E]++,E=-2);if(E===-1){if(t===this.prerelease.join(".")&&s===!1)throw new Error("invalid increment argument: identifier already exists");this.prerelease.push(i)}}if(t){let E=[t,i];s===!1&&(E=[t]),U(this.prerelease[0],t)===0?isNaN(this.prerelease[1])&&(this.prerelease=E):this.prerelease=E}break}default:throw new Error(`invalid increment argument: ${e}`)}return this.raw=this.format(),this.build.length&&(this.raw+=`+${this.build.join(".")}`),this}};re.exports=j});var ne=$((Or,ie)=>{"use strict";var se=S(),pt=(r,e,t=!1)=>{if(r instanceof se)return r;try{return new se(r,e)}catch(s){if(!t)return null;throw s}};ie.exports=pt});var Ee=$((Ar,ae)=>{"use strict";var Lt=ne(),Nt=(r,e)=>{let t=Lt(r,e);return t?t.version:null};ae.exports=Nt});var oe=$((Tr,le)=>{"use strict";var b=class{constructor(){this.max=1e3,this.map=new Map}get(e){let t=this.map.get(e);if(t!==void 0)return this.map.delete(e),this.map.set(e,t),t}delete(e){return this.map.delete(e)}set(e,t){if(!this.delete(e)&&t!==void 0){if(this.map.size>=this.max){let i=this.map.keys().next().value;this.delete(i)}this.map.set(e,t)}return this}};le.exports=b});var A=$((dr,he)=>{"use strict";var ce=S(),Ot=(r,e,t)=>new ce(r,t).compare(new ce(e,t));he.exports=Ot});var fe=$((Sr,ue)=>{"use strict";var At=A(),Tt=(r,e,t)=>At(r,e,t)===0;ue.exports=Tt});var Re=$((mr,$e)=>{"use strict";var dt=A(),St=(r,e,t)=>dt(r,e,t)!==0;$e.exports=St});var pe=$((Pr,Ie)=>{"use strict";var mt=A(),Pt=(r,e,t)=>mt(r,e,t)>0;Ie.exports=Pt});var Ne=$((wr,Le)=>{"use strict";var wt=A(),Ct=(r,e,t)=>wt(r,e,t)>=0;Le.exports=Ct});var Ae=$((Cr,Oe)=>{"use strict";var Dt=A(),Gt=(r,e,t)=>Dt(r,e,t)<0;Oe.exports=Gt});var de=$((Dr,Te)=>{"use strict";var vt=A(),gt=(r,e,t)=>vt(r,e,t)<=0;Te.exports=gt});var me=$((Gr,Se)=>{"use strict";var Ft=fe(),Xt=Re(),qt=pe(),xt=Ne(),yt=Ae(),Ut=de(),jt=(r,e,t,s)=>{switch(e){case"===":return typeof r=="object"&&(r=r.version),typeof t=="object"&&(t=t.version),r===t;case"!==":return typeof r=="object"&&(r=r.version),typeof t=="object"&&(t=t.version),r!==t;case"":case"=":case"==":return Ft(r,t,s);case"!=":return Xt(r,t,s);case">":return qt(r,t,s);case">=":return xt(r,t,s);case"<":return yt(r,t,s);case"<=":return Ut(r,t,s);default:throw new TypeError(`Invalid operator: ${e}`)}};Se.exports=jt});var ge=$((vr,ve)=>{"use strict";var m=Symbol("SemVer ANY"),V=class r{static get ANY(){return m}constructor(e,t){if(t=Pe(t),e instanceof r){if(e.loose===!!t.loose)return e;e=e.value}e=e.trim().split(/\s+/).join(" "),H("comparator",e,t),this.options=t,this.loose=!!t.loose,this.parse(e),this.semver===m?this.value="":this.value=this.operator+this.semver.version,H("comp",this)}parse(e){let t=this.options.loose?we[Ce.COMPARATORLOOSE]:we[Ce.COMPARATOR],s=e.match(t);if(!s)throw new TypeError(`Invalid comparator: ${e}`);this.operator=s[1]!==void 0?s[1]:"",this.operator==="="&&(this.operator=""),s[2]?this.semver=new De(s[2],this.options.loose):this.semver=m}toString(){return this.value}test(e){if(H("Comparator.test",e,this.options.loose),this.semver===m||e===m)return!0;if(typeof e=="string")try{e=new De(e,this.options)}catch{return!1}return _(e,this.operator,this.semver,this.options)}intersects(e,t){if(!(e instanceof r))throw new TypeError("a Comparator is required");return this.operator===""?this.value===""?!0:new Ge(e.value,t).test(this.value):e.operator===""?e.value===""?!0:new Ge(this.value,t).test(e.semver):(t=Pe(t),t.includePrerelease&&(this.value==="<0.0.0-0"||e.value==="<0.0.0-0")||!t.includePrerelease&&(this.value.startsWith("<0.0.0")||e.value.startsWith("<0.0.0"))?!1:!!(this.operator.startsWith(">")&&e.operator.startsWith(">")||this.operator.startsWith("<")&&e.operator.startsWith("<")||this.semver.version===e.semver.version&&this.operator.includes("=")&&e.operator.includes("=")||_(this.semver,"<",e.semver,t)&&this.operator.startsWith(">")&&e.operator.startsWith("<")||_(this.semver,">",e.semver,t)&&this.operator.startsWith("<")&&e.operator.startsWith(">")))}};ve.exports=V;var Pe=D(),{safeRe:we,t:Ce}=C(),_=me(),H=d(),De=S(),Ge=X()});var X=$((gr,xe)=>{"use strict";var bt=/\s+/g,k=class r{constructor(e,t){if(t=Ht(t),e instanceof r)return e.loose===!!t.loose&&e.includePrerelease===!!t.includePrerelease?e:new r(e.raw,t);if(e instanceof W)return this.raw=e.value,this.set=[[e]],this.formatted=void 0,this;if(this.options=t,this.loose=!!t.loose,this.includePrerelease=!!t.includePrerelease,this.raw=e.trim().replace(bt," "),this.set=this.raw.split("||").map(s=>this.parseRange(s.trim())).filter(s=>s.length),!this.set.length)throw new TypeError(`Invalid SemVer Range: ${this.raw}`);if(this.set.length>1){let s=this.set[0];if(this.set=this.set.filter(i=>!Xe(i[0])),this.set.length===0)this.set=[s];else if(this.set.length>1){for(let i of this.set)if(i.length===1&&Zt(i[0])){this.set=[i];break}}}this.formatted=void 0}get range(){if(this.formatted===void 0){this.formatted="";for(let e=0;e<this.set.length;e++){e>0&&(this.formatted+="||");let t=this.set[e];for(let s=0;s<t.length;s++)s>0&&(this.formatted+=" "),this.formatted+=t[s].toString().trim()}}return this.formatted}format(){return this.range}toString(){return this.range}parseRange(e){e=e.replace(Kt,"");let s=((this.options.includePrerelease&&Yt)|(this.options.loose&&zt))+":"+e,i=Fe.get(s);if(i)return i;let E=this.options.loose,o=E?p[I.HYPHENRANGELOOSE]:p[I.HYPHENRANGE];e=e.replace(o,Er(this.options.includePrerelease)),u("hyphen replace",e),e=e.replace(p[I.COMPARATORTRIM],Wt),u("comparator trim",e),e=e.replace(p[I.TILDETRIM],Bt),u("tilde trim",e),e=e.replace(p[I.CARETTRIM],Mt),u("caret trim",e);let h=e.split(" ").map(R=>Jt(R,this.options)).join(" ").split(/\s+/).map(R=>ar(R,this.options));E&&(h=h.filter(R=>(u("loose invalid filter",R,this.options),!!R.match(p[I.COMPARATORLOOSE])))),u("range list",h);let c=new Map,f=h.map(R=>new W(R,this.options));for(let R of f){if(Xe(R))return[R];c.set(R.value,R)}c.size>1&&c.has("")&&c.delete("");let N=[...c.values()];return Fe.set(s,N),N}intersects(e,t){if(!(e instanceof r))throw new TypeError("a Range is required");return this.set.some(s=>qe(s,t)&&e.set.some(i=>qe(i,t)&&s.every(E=>i.every(o=>E.intersects(o,t)))))}test(e){if(!e)return!1;if(typeof e=="string")try{e=new Vt(e,this.options)}catch{return!1}for(let t=0;t<this.set.length;t++)if(lr(this.set[t],e,this.options))return!0;return!1}};xe.exports=k;var _t=oe(),Fe=new _t,Ht=D(),W=ge(),u=d(),Vt=S(),{safeRe:p,src:kt,t:I,comparatorTrimReplace:Wt,tildeTrimReplace:Bt,caretTrimReplace:Mt}=C(),{FLAG_INCLUDE_PRERELEASE:Yt,FLAG_LOOSE:zt}=w(),Kt=new RegExp(kt[I.BUILD],"g"),Xe=r=>r.value==="<0.0.0-0",Zt=r=>r.value==="",qe=(r,e)=>{let t=!0,s=r.slice(),i=s.pop();for(;t&&s.length;)t=s.every(E=>i.intersects(E,e)),i=s.pop();return t},Jt=(r,e)=>(r=r.replace(p[I.BUILD],""),u("comp",r,e),r=tr(r,e),u("caret",r),r=Qt(r,e),u("tildes",r),r=sr(r,e),u("xrange",r),r=nr(r,e),u("stars",r),r),L=r=>!r||r.toLowerCase()==="x"||r==="*",Qt=(r,e)=>r.trim().split(/\s+/).map(t=>er(t,e)).join(" "),er=(r,e)=>{let t=e.loose?p[I.TILDELOOSE]:p[I.TILDE];return r.replace(t,(s,i,E,o,h)=>{u("tilde",r,s,i,E,o,h);let c;return L(i)?c="":L(E)?c=`>=${i}.0.0 <${+i+1}.0.0-0`:L(o)?c=`>=${i}.${E}.0 <${i}.${+E+1}.0-0`:h?(u("replaceTilde pr",h),c=`>=${i}.${E}.${o}-${h} <${i}.${+E+1}.0-0`):c=`>=${i}.${E}.${o} <${i}.${+E+1}.0-0`,u("tilde return",c),c})},tr=(r,e)=>r.trim().split(/\s+/).map(t=>rr(t,e)).join(" "),rr=(r,e)=>{u("caret",r,e);let t=e.loose?p[I.CARETLOOSE]:p[I.CARET],s=e.includePrerelease?"-0":"";return r.replace(t,(i,E,o,h,c)=>{u("caret",r,i,E,o,h,c);let f;return L(E)?f="":L(o)?f=`>=${E}.0.0${s} <${+E+1}.0.0-0`:L(h)?E==="0"?f=`>=${E}.${o}.0${s} <${E}.${+o+1}.0-0`:f=`>=${E}.${o}.0${s} <${+E+1}.0.0-0`:c?(u("replaceCaret pr",c),E==="0"?o==="0"?f=`>=${E}.${o}.${h}-${c} <${E}.${o}.${+h+1}-0`:f=`>=${E}.${o}.${h}-${c} <${E}.${+o+1}.0-0`:f=`>=${E}.${o}.${h}-${c} <${+E+1}.0.0-0`):(u("no pr"),E==="0"?o==="0"?f=`>=${E}.${o}.${h}${s} <${E}.${o}.${+h+1}-0`:f=`>=${E}.${o}.${h}${s} <${E}.${+o+1}.0-0`:f=`>=${E}.${o}.${h} <${+E+1}.0.0-0`),u("caret return",f),f})},sr=(r,e)=>(u("replaceXRanges",r,e),r.split(/\s+/).map(t=>ir(t,e)).join(" ")),ir=(r,e)=>{r=r.trim();let t=e.loose?p[I.XRANGELOOSE]:p[I.XRANGE];return r.replace(t,(s,i,E,o,h,c)=>{u("xRange",r,s,i,E,o,h,c);let f=L(E),N=f||L(o),R=N||L(h),T=R;return i==="="&&T&&(i=""),c=e.includePrerelease?"-0":"",f?i===">"||i==="<"?s="<0.0.0-0":s="*":i&&T?(N&&(o=0),h=0,i===">"?(i=">=",N?(E=+E+1,o=0,h=0):(o=+o+1,h=0)):i==="<="&&(i="<",N?E=+E+1:o=+o+1),i==="<"&&(c="-0"),s=`${i+E}.${o}.${h}${c}`):N?s=`>=${E}.0.0${c} <${+E+1}.0.0-0`:R&&(s=`>=${E}.${o}.0${c} <${E}.${+o+1}.0-0`),u("xRange return",s),s})},nr=(r,e)=>(u("replaceStars",r,e),r.trim().replace(p[I.STAR],"")),ar=(r,e)=>(u("replaceGTE0",r,e),r.trim().replace(p[e.includePrerelease?I.GTE0PRE:I.GTE0],"")),Er=r=>(e,t,s,i,E,o,h,c,f,N,R,T)=>(L(s)?t="":L(i)?t=`>=${s}.0.0${r?"-0":""}`:L(E)?t=`>=${s}.${i}.0${r?"-0":""}`:o?t=`>=${t}`:t=`>=${t}${r?"-0":""}`,L(f)?c="":L(N)?c=`<${+f+1}.0.0-0`:L(R)?c=`<${f}.${+N+1}.0-0`:T?c=`<=${f}.${N}.${R}-${T}`:r?c=`<${f}.${N}.${+R+1}-0`:c=`<=${c}`,`${t} ${c}`.trim()),lr=(r,e,t)=>{for(let s=0;s<r.length;s++)if(!r[s].test(e))return!1;if(e.prerelease.length&&!t.includePrerelease){for(let s=0;s<r.length;s++)if(u(r[s].semver),r[s].semver!==W.ANY&&r[s].semver.prerelease.length>0){let i=r[s].semver;if(i.major===e.major&&i.minor===e.minor&&i.patch===e.patch)return!0}return!1}return!0}});var Ue=$((Fr,ye)=>{"use strict";var or=X(),cr=(r,e)=>{try{return new or(r,e).range||"*"}catch{return null}};ye.exports=cr});var be=$((Xr,je)=>{"use strict";var hr=X(),ur=(r,e,t)=>{try{e=new hr(e,t)}catch{return!1}return e.test(r)};je.exports=ur});var fr={};ze(fr,{satisfies:()=>Ve.default,valid:()=>_e.default,validRange:()=>He.default});var _e=q(Ee()),He=q(Ue()),Ve=q(be());return Ke(fr);})();

'use strict';

(() => {
  const lang = window.Lab?.lang ?? (new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru');
  const t = (ru, en) => lang === 'en' ? en : ru;
  const $ = id => document.getElementById(id);
  const manifestInput = $('tree-manifest');
  const lockInput = $('tree-lock');
  const limit = { chars: 8_000_000, edges: 240, depth: 12 };
  const groupKeys = ['dependencies', 'optionalDependencies', 'devDependencies', 'peerDependencies'];
  const packageName = /^(?:@[a-z\d~][a-z\d._~-]*\/)?[a-z\d~][a-z\d._~-]*$/i;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const usableName = name => name.length <= 214 && packageName.test(name);
  const has = (obj, key) => Object.hasOwn(obj, key);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const builtIn = new Map([
    ['react@18.2.0', {}], ['react@18.3.1', {}],
    ['react-dom@18.2.0', { peerDependencies: { react: '^18.2.0' } }],
    ['react-dom@18.3.1', { peerDependencies: { react: '^18.3.1' } }],
  ]);
  let registry = new Map();
  let currentManifest = null;
  let request = null;
  let timer;
  let graph;

  function parseJson(raw, fragment) {
    if (raw.length > limit.chars) throw Error(t('Лимит поля — 8 млн символов.', 'The input limit is 8 million characters.'));
    const trimmed = raw.trim();
    if (!trimmed) throw Error(t('Вставьте package.json или выберите пример.', 'Paste a package.json or choose an example.'));
    return JSON.parse(fragment && trimmed.startsWith('"') ? '{' + trimmed + '}' : trimmed);
  }

  function readManifest() {
    let value = parseJson(manifestInput.value, true);
    if (!object(value)) throw Error(t('package.json должен быть объектом JSON.', 'package.json must be a JSON object.'));
    if (!groupKeys.some(k => has(value, k)) && !['name', 'version', 'scripts', 'private', 'workspaces'].some(k => has(value, k))) {
      value = { dependencies: value };
    }
    for (const section of groupKeys) {
      if (!has(value, section)) continue;
      if (!object(value[section])) throw Error(section + t(' должен быть объектом.', ' must be an object.'));
      for (const [name, range] of Object.entries(value[section])) {
        if (!usableName(name) || typeof range !== 'string') throw Error(section + t(' должен содержать имена пакетов и строковые диапазоны.', ' must contain package names and string ranges.'));
      }
    }
    return value;
  }

  function readLock() {
    if (!lockInput.value.trim()) return null;
    const value = parseJson(lockInput.value, false);
    if (!object(value) || value.lockfileVersion !== 3 || !object(value.packages) || !object(value.packages[''])) {
      throw Error(t('Нужен package-lock.json версии 3 с таблицей packages и корневой записью.', 'Use a v3 package-lock.json with a packages table and a root entry.'));
    }
    return value.packages;
  }

  function* declarations(record, root) {
    for (const group of groupKeys) {
      if (group === 'devDependencies' && !root) continue;
      const map = record[group];
      if (!object(map)) continue;
      for (const [name, range] of Object.entries(map)) {
        if (!usableName(name) || typeof range !== 'string') continue;
        if (group === 'dependencies' && object(record.optionalDependencies) && has(record.optionalDependencies, name)) continue;
        yield { name, range, group, optional: group === 'optionalDependencies' ||
          (group === 'peerDependencies' && record.peerDependenciesMeta?.[name]?.optional === true) };
      }
    }
  }

  // A peer's provider must be placed beside or above its consumer.
  function lockedPackage(packages, owner, edge) {
    const dirs = owner ? owner.split('/') : [];
    if (edge.group === 'peerDependencies' && owner) {
      const lastModules = dirs.lastIndexOf('node_modules');
      if (lastModules >= 0) dirs.splice(lastModules);
    }
    while (true) {
      if (dirs[dirs.length - 1] !== 'node_modules') {
        const key = [...dirs, 'node_modules', edge.name].join('/');
        if (has(packages, key)) return { key, record: packages[key] };
      }
      if (!dirs.length) return null;
      dirs.pop();
    }
  }

  function buildGraph(manifest, packages) {
    const seen = new Set();
    const roots = [...declarations(manifest, true)];
    const assignments = new Map();
    for (const edge of roots) {
      const version = treeSemver.valid(edge.range);
      if (!assignments.has(edge.name)) assignments.set(edge.name, version);
      else if (assignments.get(edge.name) !== version) assignments.set(edge.name, null);
    }
    const result = { nodes: [], bad: 0, good: 0, unknown: 0, total: 0, clipped: false };
    function walk(edges, owner, ancestors, depth) {
      const nodes = [];
      for (const edge of edges) {
        if (result.total >= limit.edges || depth > limit.depth) { result.clipped = true; break; }
        result.total++;
        let key, record, version, reason = '', state = 'unknown';
        if (packages) {
          const match = lockedPackage(packages, owner, edge);
          if (match && object(match.record) && !match.record.link) {
            key = match.key; record = match.record;
            version = typeof record.version === 'string' ? record.version : undefined;
          } else if (match?.record?.link) {
            reason = t('Локальная ссылка или workspace. Ветка требует отдельной проверки.', 'Local link or workspace. Check this branch separately.');
          } else {
            reason = edge.optional ? t('Необязательная запись отсутствует.', 'Optional entry is absent.')
              : t('В доступной ветке lock-файла нет записи.', 'No matching record at this location in the lockfile.');
          }
        } else {
          if (!owner) version = treeSemver.valid(edge.range) || undefined;
          if (owner && edge.group === 'peerDependencies') version = assignments.get(edge.name) || undefined;
          if (version) {
            key = edge.name + '@' + version;
            record = registry.get(key) ?? builtIn.get(key);
          }
          if (!version) reason = t('Точная версия неизвестна. Добавьте lock-файл.', 'The exact version is unknown. Add a lockfile.');
          else if (!record) reason = t('Версия задана в манифесте. Для проверки её зависимостей нужны метаданные.', 'Version pinned in the manifest. Its dependencies need package metadata.');
        }
        if (version && treeSemver.valid(version) && treeSemver.validRange(edge.range) !== null) {
          const matches = treeSemver.satisfies(version, edge.range);
          if (packages || (owner && edge.group === 'peerDependencies')) {
            if (matches) state = 'good';
            else if (manifest.overrides) reason = t('Версия вне исходного диапазона. Проверьте overrides.', 'Version outside the original range. Check overrides.');
            else state = 'bad';
          } else if (!reason) reason = t('Зафиксировано в package.json.', 'Pinned in package.json.');
        } else if (version) reason = t('Требование или версия вне формата semver.', 'The requirement or version is outside semver.');
        else if (!reason) reason = t('У записи нет точной версии.', 'No exact version in this record.');
        result[state]++;
        const children = [];
        if (key && record) {
          if (ancestors.has(key)) reason = t('Цикл. Этот пакет уже есть выше в этой ветке.', 'Cycle. This package already appears on this path.');
          else if (seen.has(key)) reason = t('Эта запись уже раскрыта в другой ветке.', 'This entry is already expanded elsewhere.');
          else {
            seen.add(key);
            const next = new Set(ancestors); next.add(key);
            children.push(...walk(declarations(record, false), key, next, depth + 1));
          }
        }
        const node = { ...edge, state, version, reason, children, key, hasConflict: state === 'bad' || children.some(n => n.hasConflict) };
        nodes.push(node);
      }
      return nodes;
    }
    result.nodes = walk(roots, '', new Set(), 1);
    return result;
  }

  function drawTree() {
    if (!graph) return;
    const onlyConflicts = $('tree-filter').checked;
    function branch(nodes, depth) {
      const list = el('ul', 'tree-branches');
      for (const node of nodes) {
        if (onlyConflicts && !node.hasConflict) continue;
        const li = el('li');
        const nested = node.children.some(child => !onlyConflicts || child.hasConflict);
        const container = nested ? el('details') : li;
        const line = el(nested ? 'summary' : 'div');
        line.append(el('span', 'tree-label', node.name + (node.version ? '@' + node.version : '')));
        const edgeType = { dependencies: '', devDependencies: 'dev ', optionalDependencies: 'optional ', peerDependencies: 'peer ' }[node.group];
        line.append(el('span', 'tree-edge', edgeType + node.range));
        if (node.state !== 'unknown') line.append(el('span', 'tree-state ' + node.state, node.state === 'bad' ? t('Конфликт', 'Conflict') : t('Подходит', 'Matches')));
        container.append(line);
        if (node.reason) container.append(el('p', 'tree-note', node.reason));
        if (nested) {
          container.open = depth < 2 || node.hasConflict;
          container.append(branch(node.children, depth + 1));
          li.append(container);
        }
        list.append(li);
      }
      return list;
    }
    const root = el('div', 'tree-root', typeof currentManifest.name === 'string' ? currentManifest.name : t('Ваш проект', 'Your project'));
    const out = $('tree-graph');
    out.replaceChildren(root, branch(graph.nodes, 0));
    if (!graph.total) out.append(el('p', 'hint', t('Список зависимостей пуст.', 'The dependency list is empty.')));
    if (onlyConflicts && !graph.bad) out.append(el('p', 'hint', t('Среди проверенных связей конфликтов нет.', 'No conflicts among checked edges.')));
    $('tree-count').textContent = t('Связей', 'Edges') + ' ' + graph.total + ' · ' + t('конфликтов', 'conflicts') + ' ' + graph.bad + ' · ' + t('диапазон проверен и подходит', 'matched') + ' ' + graph.good + ' · ' + t('без проверки', 'unverified') + ' ' + graph.unknown;
    $('tree-limit').textContent = graph.clipped ? t('Показана часть дерева. Предел — 240 связей и 12 уровней. Итоги относятся к показанной части.', 'Partial tree. Limit: 240 edges and 12 levels. Counts describe the displayed portion.') : '';
  }

  function eligible(manifest) {
    const indexes = new Map();
    if (!manifest) return indexes;
    for (const edge of declarations(manifest, true)) {
      if (edge.name.startsWith('@') || !treeSemver.valid(edge.range)) continue;
      const key = edge.name + '@' + edge.range;
      indexes.set(key, edge);
    }
    return indexes;
  }

  function showChoices(manifest) {
    const list = $('tree-registry-list');
    list.replaceChildren();
    const entries = [...eligible(manifest)];
    for (const [key] of entries.slice(0, 16)) {
      const label = el('label', 'tree-filter');
      const input = el('input');
      input.type = 'checkbox'; input.value = key;
      label.append(input, document.createTextNode(key)); list.append(label);
    }
    if (!entries.length) list.textContent = t('В манифесте нет публичных кандидатов без scope с точной версией.', 'No unscoped package with an exact version is available.');
    if (entries.length > 16) list.append(el('p', 'hint', t('Показаны первые 16 точных версий.', 'Showing the first 16 exact versions.')));
    $('tree-load-meta').disabled = true;
  }

  function render(resetChoices) {
    graph = currentManifest = null;
    try {
      const manifest = readManifest();
      const packages = readLock();
      currentManifest = manifest;
      graph = buildGraph(manifest, packages);
      $('tree-error').textContent = '';
      $('tree-mode').textContent = packages ?
        t('Версии из lock-файла. Каждая связь сравнивает требование с версией в ближайшей доступной папке. Проверки приложения и движка выполняются отдельно.', 'Lockfile versions. Each edge compares a requirement with the version in the nearest valid location. Runtime and engine checks are separate.')
        : t('План по манифесту. Для React 18.2.0 и 18.3.1 встроены требования React DOM. Сторонние пакеты можно дополнить данными npm. Расположение и фактические версии даёт lock-файл.', 'Manifest preview. React DOM peer requirements are built in for 18.2.0 and 18.3.1. You can load npm metadata for other packages. A lockfile supplies actual versions and locations.');
      $('tree-netbox').hidden = Boolean(packages);
      if (resetChoices) showChoices(manifest);
      drawTree();
    } catch (error) {
      $('tree-error').textContent = error instanceof SyntaxError ? t('Проверьте синтаксис JSON в заполненных полях.', 'Check JSON syntax in both input fields.') : error.message;
      for (const id of ['tree-mode', 'tree-count', 'tree-graph', 'tree-limit']) $(id).replaceChildren();
      $('tree-netbox').hidden = true;
    }
  }

  function changed() {
    clearTimeout(timer);
    request?.abort(); request = null; registry = new Map();
    $('tree-network-result').textContent = '';
    timer = setTimeout(() => render(true), 140);
  }

  function seed(reactVersion) {
    manifestInput.value = JSON.stringify({ name: 'react-demo', dependencies: { react: reactVersion, 'react-dom': '18.3.1' } }, null, 2);
    lockInput.value = ''; $('tree-file').value = ''; $('tree-filter').checked = false;
    changed(); clearTimeout(timer); render(true);
  }

  async function getMetadata() {
    const available = eligible(currentManifest);
    const selected = [...$('tree-registry-list').querySelectorAll('input:checked')].map(x => available.get(x.value)).filter(Boolean);
    if (!selected.length || lockInput.value.trim()) return;
    request?.abort();
    const controller = new AbortController(); request = controller;
    const deadline = setTimeout(() => controller.abort(), 15000);
    const button = $('tree-load-meta');
    button.disabled = true;
    const status = $('tree-network-result');
    status.textContent = t('Запрашиваю выбранные версии…', 'Loading selected versions…');
    const received = new Map();
    const failures = [];
    await Promise.all(selected.map(async edge => {
      const key = edge.name + '@' + edge.range;
      try {
        const response = await fetch('https://registry.npmjs.org/' + encodeURIComponent(edge.name) + '/' + encodeURIComponent(edge.range), {signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer',redirect:'error'});
        if (!response.ok) throw Error(String(response.status));
        const record = await response.json();
        if (!object(record) || record.name !== edge.name || record.version !== treeSemver.valid(edge.range)) throw Error('identity');
        received.set(edge.name + '@' + record.version, record);
      } catch { failures.push(key); }
    }));
    clearTimeout(deadline);
    if (request !== controller) return;
    for (const [key, record] of received) registry.set(key, record);
    request = null;
    status.textContent = t('Загружено записей', 'Loaded records') + ' ' + received.size + '.' +
      (failures.length ? ' ' + t('Недоступны', 'Unavailable') + ' — ' + failures.join(', ') + '.' : '');
    button.disabled = !$('tree-registry-list').querySelector('input:checked');
    render(false);
  }

  manifestInput.addEventListener('input', changed);
  lockInput.addEventListener('input', changed);
  $('tree-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > limit.chars) { $('tree-error').textContent = t('Лимит файла — 8 МБ.', 'The file limit is 8 MB.'); return; }
    try {
      lockInput.value = await file.text(); changed();
    } catch { $('tree-error').textContent = t('Не удалось прочитать файл.', 'Could not read this file.'); }
  });
  $('tree-broken').addEventListener('click', () => seed('18.2.0'));
  $('tree-fixed').addEventListener('click', () => seed('18.3.1'));
  $('tree-filter').addEventListener('change', drawTree);
  $('tree-registry-list').addEventListener('change', () => {
    $('tree-load-meta').disabled = Boolean(request) || !$('tree-registry-list').querySelector('input:checked');
  });
  $('tree-load-meta').addEventListener('click', getMetadata);
  if (lang === 'en') document.title = 'Dependency tree · DepLoom';
  seed('18.2.0');
})();

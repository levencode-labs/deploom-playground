'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const base = path.join(__dirname, '../docs');
const originalIds = [
  'range-and-lock','shared-host','upgrade-cohorts','merged-branches',
  'nested-copies','borrowed-dependency','react-instance',
  'lock-after-merge','lock-reselection','npm-lock-reader','peer-install-mode','install-omissions',
  'rollup-platform','consumer-tarball','registry-view','registry-artifact',
  'module-loader','type-boundaries','user-actions','browser-and-server',
  'audit-coverage','audit-and-api','tested-snapshot','search-bounds','repeat-codemod'
];
const newIds=['eslint-family','stylelint-family','storybook-family','angular-ts-limit','across-environments','missing-release','quill-react19'];
function runPatch(){
  const input={DepLoomBookChapters:[{id:'source',title:['old','old'],lessons:originalIds.map(id=>({id,title:['old','old'],lead:['old','old'],lab:{prompt:['old','old'],states:[{label:['old','old'],value:['old','old'],detail:['old','old'],tone:'warn'},{label:['again','again'],value:['again','again'],detail:['again','again'],tone:'warn'}]},sources:[{label:['old source','old source'],url:'https://example.org'}]}))}]};
  input.globalThis=input;
  vm.runInNewContext(fs.readFileSync(path.join(base,'handbook-coach.js'),'utf8'),input,{filename:'handbook-coach.js'});
  return input;
}
test('32 lessons in six chapters with unique IDs, beginner-first ordering and no missing original case',()=>{
  const input=runPatch();
  const lessons=input.DepLoomBookChapters.flatMap(ch=>ch.lessons);
  assert.equal(input.DepLoomBookChapters.length,6);
  assert.equal(lessons.length,32);
  assert.equal(new Set(lessons.map(l=>l.id)).size,32);
  assert.ok(originalIds.every(id=>lessons.some(l=>l.id===id)));
  assert.ok(newIds.every(id=>lessons.some(l=>l.id===id)));
  assert.equal(lessons[0].id,'range-and-lock');
  assert.equal(lessons.at(-1).id,'repeat-codemod');
  assert.deepEqual(lessons.map(l=>l.level),lessons.map(l=>l.level).sort((a,b)=>a-b));
  assert.ok(lessons.every(l=>l.lab?.states?.length>=2));
});
test('every worked lesson offers two different snippets, two fixes, a check and bilingual step-by-step instructions',()=>{
  const lessons=runPatch().DepLoomBookChapters.flatMap(ch=>ch.lessons);
  for (const lesson of lessons){
    assert.ok(lesson.steps.length>=3,lesson.id);
    assert.equal(lesson.examples.length,2,lesson.id);
    assert.equal(lesson.solutions.length,2,lesson.id);
    assert.ok(lesson.examples.every(e=>e.code.every(Boolean)),lesson.id);
    assert.notEqual(lesson.examples[0].code[0],lesson.examples[1].code[0],lesson.id);
    for(const item of [lesson.title,lesson.lead,lesson.check,...lesson.steps,...lesson.examples.flatMap(e=>[e.title,e.body,e.file,e.code]),...lesson.solutions.flatMap(s=>[s.title,s.body,s.code])]){
      assert.ok(Array.isArray(item)&&item.length===2&&item.every(s=>typeof s==='string'&&s.trim()),lesson.id);
    }
    assert.ok(lesson.sources?.every(s=>new URL(s.url).protocol==='https:'),lesson.id);
  }
});
test('Jest and Angular are two different lessons: Jest experiment contains no Angular branch',()=>{
  const lessons=runPatch().DepLoomBookChapters.flatMap(ch=>ch.lessons);
  const jest=lessons.find(x=>x.id==='upgrade-cohorts'), angular=lessons.find(x=>x.id==='angular-ts-limit');
  assert.ok(jest && angular);
  assert.ok(jest.lead[0].includes('Jest'));
  assert.ok(!/compiler-cli|Angular 9|TypeScript 3\.8/.test(jest.examples.map(x=>x.body[0]).join(' ')));
  assert.deepEqual(Array.from(jest.lab.states, s=>s.tone), ['ok','bad','ok']);
  assert.ok(angular.examples.some(e=>e.code[0].includes('>=3.6 <3.8')));
  assert.ok(lessons.indexOf(angular)>lessons.indexOf(jest));
});
test('new lessons explain unfamiliar terms and the original labs and sources are preserved',()=>{
  const lessons=runPatch().DepLoomBookChapters.flatMap(ch=>ch.lessons);
  assert.ok(lessons.find(x=>x.id==='borrowed-dependency').terms.some(t=>t.term[0]==='Монорепозиторий'));
  const old=lessons.find(x=>x.id==='range-and-lock');
  assert.equal(old.lab.prompt[0],'old');
  assert.equal(old.sources[0].url,'https://example.org');
  assert.ok(lessons.find(x=>x.id==='missing-release').sources.some(s=>s.url.includes('npmjs.org')));
});

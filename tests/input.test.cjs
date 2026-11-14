const test=require('node:test'),assert=require('node:assert/strict');const {normalizeComputerArgs}=require('../electron/input.cjs');
test('common model key spellings normalize to the same bounded input action',()=>{assert.deepEqual(normalizeComputerArgs({action:'press_key',key:'ctrl+a',frame:'f2'}),{action:'key',key:'Control+A',frame:'f2'});assert.equal(normalizeComputerArgs({action:'key',key:'Return'}).key,'Enter');});
test('unknown actions and OS shortcuts do not acquire a supported meaning',()=>{assert.equal(normalizeComputerArgs({action:'run_shell',key:'Win+R'}).action,'run_shell');assert.equal(normalizeComputerArgs({action:'key',key:'Win+R'}).key,'Win+R');});
test('optional null placeholders are omitted and numeric strings retain coordinate validation',()=>{assert.deepEqual(normalizeComputerArgs({action:'click',x:'23.5',y:'400',key:null,text:null}),{action:'click',x:23.5,y:400});assert.equal(normalizeComputerArgs({action:'click',x:'NaN'}).x,'NaN');});

test('irrelevant empty model fields cannot break key and text input',()=>{
 assert.deepEqual(normalizeComputerArgs({action:'type',frame:'f2',text:'Tokyo',x:'',y:'',key:'',scrollY:0}),{action:'type',frame:'f2',text:'Tokyo'});
 assert.deepEqual(normalizeComputerArgs({action:'key',frame:'f3',key:'ENTER',x:'',y:''}),{action:'key',frame:'f3',key:'Enter'});
});

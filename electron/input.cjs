// Accept common spelling variants while retaining the bounded input vocabulary.
function normalizeComputerArgs(value){
  const args={...value};const actions={press_key:'key',keypress:'key',press:'key',type_text:'type',doubleClick:'double_click'};
  args.action=actions[args.action]||args.action;
  for(const field of ['x','y','text','key','scrollY','replace'])if(args[field]===null||args[field]===undefined)delete args[field];
  for(const field of ['x','y','scrollY'])if(typeof args[field]==='string'&&/^-?\d+(?:\.\d+)?$/.test(args[field]))args[field]=Number(args[field]);
  const applicable={click:['x','y'],double_click:['x','y'],move:['x','y'],type:['text','replace'],key:['key'],scroll:['scrollY'],screenshot:[]}[args.action];
  if(applicable)for(const field of ['x','y','text','key','scrollY','replace'])if(!applicable.includes(field))delete args[field];
  if(typeof args.key==='string'){
    const aliases={'CTRL+A':'Control+A','CONTROL+A':'Control+A','CTRL+F':'Control+F','CONTROL+F':'Control+F','CTRL+L':'Control+L','CONTROL+L':'Control+L','RETURN':'Enter','ENTER':'Enter','ESC':'Escape','ESCAPE':'Escape','TAB':'Tab','BACKSPACE':'Backspace','DOWN':'ArrowDown','UP':'ArrowUp','LEFT':'ArrowLeft','RIGHT':'ArrowRight'};
    args.key=aliases[args.key.replace(/\s/g,'').toUpperCase()]||args.key;
  }
  return args;
}
module.exports={normalizeComputerArgs};

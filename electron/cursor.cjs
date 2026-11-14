const LAYOUT={width:96,height:112,handWidth:64,handHeight:75,hotspotX:16+70*64/180,hotspotY:4+15.25*75/210};
function placement(point){return {x:Math.round(point.x-LAYOUT.hotspotX),y:Math.round(point.y-LAYOUT.hotspotY)};}
class ActionCursor{
  constructor({toDip=point=>point,onChange=()=>{}}={}){this.toDip=toDip;this.onChange=onChange;this.point=null;this.phase='point';}
  accept(event){if(!Number.isFinite(event.x)||!Number.isFinite(event.y))return;this.point=this.toDip({x:event.x,y:event.y});this.phase=event.phase==='down'?'down':event.phase==='type'?'type':'point';this.onChange({point:this.point,phase:this.phase});}
  release(){this.point=null;this.phase='point';this.onChange({point:null,phase:'point'});}
}
module.exports={LAYOUT,placement,ActionCursor};

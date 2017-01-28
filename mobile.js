(function(win) {
   tictac.extend({
      mobile: true,

   });
   
   let bigcells = document.querySelectorAll(".big");
   for (let bigcell of bigcells) {
      bigcell.addEventListener("click", function(evt) {
         let tgt = evt.target;
         let tid = tgt.id.replace(/\D/g,'');
         tictac.move("game"+tictac.state.currentGame+""+tid, tictac.state.me.mymark);
      });
      bigcell.addEventListener("mouseover", function(evt) {
         if (!tictac.state.currentGame) {
            let tgt = evt.target;
            let tid = tgt.id.replace(/\D/g,'');
            let container = $$("container"+tid);
            if (container) {
               container.classList.add("pickGame");
            }
            tgt.classList.add("pickGame");
         }
      });
      bigcell.addEventListener("mouseout", function(evt) {
            let tgt = evt.target;
            let tid = tgt.id.replace(/\D/g,'');
            let container = $$("container"+tid);
            if (container) {
               container.classList.remove("pickGame");
            }
            tgt.classList.remove("pickGame");
 
      });
   }
})(window);

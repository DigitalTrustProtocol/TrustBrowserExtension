//http://bililite.com/blog/2015/01/14/rethinking-fn-sendkeys/
$.fn.sendkeys = function (x){
    x = x.replace(/([^{])\n/g, '$1{enter}'); // turn line feeds into explicit break insertions, but not if escaped
    return this.each( function(){
      bililiteRange(this).bounds('selection').sendkeys(x).select();
      this.focus();
    });
  };


$(function() {
    jQuery.fn.wrapClick = function(before, after) {
        // Get and store the original click handler.
        // TODO: add a conditional to check if click event exists.
        var _orgClick = $._data(this[0], 'events').click[0].handler,
            _self = this;

        // Remove click event from object.
        _self.off('click');

        // Add new click event with before and after functions.
        return _self.click(function() {
            before.call(_self);
            _orgClick.call(_self);
            //after.call(_self);
        });
    };
});
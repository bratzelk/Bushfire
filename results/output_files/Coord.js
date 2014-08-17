define(function () {

    var Coord = function (i, j) {
        var pi = parseInt(i);
        var pj = parseInt(j);
        if (!this.is_valid(pi, pj)) {
            throw new Error('Invalid coordinates: ' + i + ', ' + j);
        }
        this.i = pi;
        this.j = pj;
    };

    Coord.prototype = {
        is_valid: function (i, j) {
            return !(isNaN(i) || isNaN(i));
        }
    };

    return Coord;

});

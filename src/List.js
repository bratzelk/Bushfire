 define([
    'src/Coord'
], function (Coord) {

    var List = function () {
        this.clear();
    };

    List.prototype = {

        clear: function () {
            this.list = [];
        },

        add: function (item) {
            this.list.push(item)
        },

        is_empty: function() {
            return (this.list.length == 0);
        },

        pop: function() {
            return this.list.pop();
        },

        // TODO I don't like this
        next: function() {
            if(!this.is_empty()) {
                return this.list.pop();
            }
            return null;
        },

        count: function() {
            return this.list.length;
        },

        pop_all: function (callback) {
            for (var i = 0; i < this.list.length; i++) {
                var item = this.list[i];
                callback(item);
            }
            this.clear();
        }

    };

    return List;

});

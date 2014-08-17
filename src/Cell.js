define(function () {

    var Cell = function (type) {
        if (typeof type == 'undefined') {
            throw new Error('No type provided');
        }
        this.type = type;
        this._entity = this.createType(type); //this.nextOfType(type);
    };

    Cell.prototype = {

        viewEnabled: true,

        // NOTE: the cache does nothing! Crafty already optimises :) Oh well...
        _cache: {},

        types: {
            'tree' : {
                'name' : 'Tree',
                'color' : '#0f0'
            },
            'fire' : {
                'name' : 'Fire',
                'color' : '#f00'
            }
        },

        default_block_size: 32,

        getView: function () {
            return this._entity;
        },
        getType: function () {
            return this.type;
        },
        nextOfType: function (type) {
            var available = this._cache[type];
            if (!available) {
                available = this._cache[type] = [];
            }
            if (available.length == 0) {
//                console.log('creating');
                return this.createType(type);
            } else {
//                console.log('reusing');
                return available.pop();
            }
        },
        destroy: function () {
//            var available = this._cache[this.type];
//            available.push(this.getView());
            var view = this.getView();
            if (view) {
                view.destroy();
            }
        },
        createType: function (type) {
            if (this.viewEnabled) {
                var entity = Crafty.e("2D, DOM, " + type);
                // TODO use this?
//                var entity = Crafty.e("2D, DOM, Color").color(this.getColor(type));
                entity.w = this.default_block_size;
                entity.h = this.default_block_size;
                entity.z = 1000;
                return entity;
            } else {
                return null;
            }
        },
        getColor: function (typeId) {
            var type = this.types[typeId];
            if (type) {
                return type.color;
            } else {
                return null;
            }
        }
    };

    return Cell;

});

define([
], function () {

    var CountModel = function () {
        this.init();
    };

    CountModel.prototype = {
        
        init: function () {
            this.counts = {};
        },

        _init_type: function (name) {
            var curr = this.counts[name];
            if (typeof curr == 'undefined') {
                this.counts[name] = 0;
            }
            return this.counts[name];
        },

        set: function (name, value) {
            this._init_type(name);
            this.counts[name] = value;
        },

        add: function (name) {
            this._init_type(name);
            this.counts[name]++;
        },

        get: function (name) {
            return this.counts[name];
        },

        remove: function (name) {
            var curr = this._init_type(name);
            var next = curr > 1 ? curr - 1 : 0;
            this.set(name, next);
        },

        del: function (name) {
            delete this.counts[name];
        },

        clear: function () {
            this.init();
        },

        get_model_counts: function () {
            // TODO clone so we don't keep a reference
            return $.extend(true, {}, this.counts);
        }

    };

    return CountModel;

});

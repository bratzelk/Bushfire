define(function () {

    var Log = function (el) {
        this.$el = $(el);
        this.init = false;
        this.$el.mouseover = false;
        var me = this;
        this.$el.hover(function () {
            me.$el.mouseover = true;
        }, function () {
            me.$el.mouseover = false;
        });
    };

    Log.prototype = {

        // Append a message to the log
        log: function (msg, type) {
            if (!this.init) {
                this.$el.html('');
                this.init = true;
            }
            this.$el.append('<p class="' + type + '">' + msg + '</p>');
            this.scrollDown();
        },

        // Scroll down unless the mouse is over the log
        scrollDown: function () {
            if (!this.$el.mouseover) {
                this.$el.scrollTop(this.$el.get(0).scrollHeight);
            }
        }

    };

    return Log;

});

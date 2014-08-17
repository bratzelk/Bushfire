define(function () {

    //http://buildnewgames.com/introduction-to-crafty/

    return {
        is_init: false,
        scale: 1,
        scale_applied: true,
        sprites: "images/sprites.png",
        init: function (args) {

            args = $.extend({
                block_width: null,
                stage_width: null,
                stage_height: null,
                scene_width: null,
                scene_height: null,
                callback: null
            }, args);

            var me = this;
            var sprites = this.sprites;

            //start crafty
            Crafty.init(args.stage_width, args.stage_height);

//            Crafty.canvas.init();

            var scale = args.scale;

            if (!scale) {
                var height_diff = args.stage_height - args.scene_height;
                var width_diff = args.stage_width - args.scene_width;
                if (height_diff < width_diff) {
                    scale = args.stage_height / args.scene_height;
                } else {
                    scale = args.stage_width / args.scene_width;
                }
            }
            me.scale = scale;

                //Get the sprite(s)
            Crafty.sprite(args.block_width, sprites, {
                // square: [0,0],
                tree: [1, 0],
                light: [2, 0],
                grass: [3, 0],
                fire: [4, 0]
            });

            //the loading screen that will display while our assets load
            Crafty.scene("loading", function () {
                //load takes an array of assets and a callback when complete
                Crafty.load([sprites], function () {
                    Crafty.scene("main"); //when everything is loaded, run the main scene
                });
                //black background with some loading text
                Crafty.background("#000000");
            });

            //the main screen
            Crafty.scene("main", function () {

                Crafty.background("#2f5700");

//                //Used to detect clicks on the canvas
//                var background_click_detector = Crafty.e("2D, DOM, Mouse").attr({w: args.stage_width, h: args.stage_height}); // TODO use other args?
//                background_click_detector.bind("Click", function (e) {
//                    //get grid coords of the cell they clicked
//                    var i = Math.floor(e.realX / args.block_width);
//                    var j = Math.floor(e.realY / args.block_width)
//
//                    //don't know if we have the log object in our scope...
//                    //console.log("Clicked on cell: "+i+","+j);
//
//                    //Change the text box values based on what the user clicked
//                    $('#burn_x').val(i);
//                    $('#burn_y').val(j);
//                });

                me.resize(args);

            });

            if (this.is_init) {
                me.resize(args);
                return;
            }

            //automatically play the loading scene at the start...
            if (!this.is_init) {
                Crafty.scene("loading");
                this.is_init = true;
            }
//            }
        },
        resize: function (args) {
            // Reset scale
            Crafty.viewport.scale(0);
            args.scale = this.scale;// = scale;
            Crafty.viewport.scale(this.scale);
            $('#border').css('width', args.scene_width * this.scale);
            $('#border').css('height', args.scene_height * this.scale);

            // I've disabled the background for faster rendering :)
//                if (me.bg) {
//                    me.bg.destroy();
//                } else {
//                    me.bg = Crafty.e("2D, Canvas, Image")
//                        .attr({w: Crafty.viewport.width / scale, h: Crafty.viewport.height / scale, z: 0, x: 0, y: 0})
//                        .image("images/grass.png", "repeat");
//                    me.bg.z = 1;
//                }
            args.callback(args);
        }
    };

});

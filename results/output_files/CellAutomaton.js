define([
    'src/Lattice',
    'src/Cell',
    'src/View',
    'src/Coord',
    'src/List'
], function (Lattice, Cell, View, Coord, List) {

    var CellAutomaton = function (args) {
        this.logger = null;
        this.init(args);
    };

    CellAutomaton.prototype = {

        CellProperties: {
            types: {
                tree: {
                    name: 'Tree'
                },
                fire: {
                    name: 'Fire'
                }
            },
            events: {
                lightning_failure: {
                    name: 'Lightning Failure'
                },
                lightning_success: {
                    name: 'Lightning Success'
                }
            },
            stats: {
                avg_clustering: {
                    name: 'Average Clustering'
                }
            }
        },

        NeighbourMode: {
            NEUMANN: {
                max_count: 4,
                name: 'Von Neumann'
            },
            MOORE: {
                max_count: 8,
                name: 'Moore'
            }
        },

        TreeGrowthMode: {
            RANDOM: {
                name: 'Random'
            },
            PROXIMITY_LINEAR: {
                name: 'Linear Proximity'
            },
            PROXIMITY_INCREASE: {
                name: 'Decreasing Proximity'
            }
        },

        FireGrowthMode: {
            INSTANT: {
                name: 'Instant'
            },
            PROXIMITY_LINEAR: {
                name: 'Linear Proximity'
            }
        },

        State: {
            OFF: 'Off',
            ON: 'On'
        },

        init: function (args) {

            args = $.extend({
                size: 15
            }, args);
            var me = this;
            this.size = args.size;
            this.state = this.State.OFF;
            this.timer = null;
            this.freq = 10; // TODO allow changing
            this.steps = {};
//            this.target = null;
            this.step_count = 0;
//            console.log('size', this.size);
            this.lattice = new Lattice({
                width: this.size,
                height: this.size,
                default_block_size: Cell.prototype.default_block_size
            });
            this.view = args.view || {};
            this.properties = $.extend({}, this.CellProperties);

            for (var prop in this.properties) {
                this.steps[prop] = {};
                var types = this.properties[prop];
                for (var type in types) {
                    this.steps[prop][type] = [];
                }
            }

            View.init({
                block_width: this.lattice.block_width,
                stage_width: args.width,
                stage_height: args.height,
                scene_width: this.lattice.block_width * this.lattice.width,
                scene_height: this.lattice.block_height * this.lattice.height,
                callback: function (args) {
                    me.lattice.scale = args.scale;
                    me.render();
                }
            });

            this.initSettings(args);
        },
        
        initSettings: function (args) {
            //a structure for keeping track of dead trees
//            this.dead_trees = new List();

            this.neighbour_mode = null;
            this.stop_callback = args.stop_callback;
            this._last_args = args;
            this.tree_growth_mode = this.TreeGrowthMode.RANDOM;
            this.fire_spread_mode = this.FireGrowthMode.INSTANT;
        },

        //burn down a tree at a specific location
        //also burns adjacent trees
        burn: function (coord) {
            //check there is actually a tree at the burn location
            var me = this;
            if (this.lattice.get_type(coord) == 'tree') {
                var fire_cell = new Cell('fire');
                this.lattice.set(coord, fire_cell);
                //add to our list of dead trees
//                this.dead_trees.add(coord);
                // TODO record into the step, but also make sure the object exists - it will crash if we add data after step_count++ but before the new assignment (perhaps put this in some functions or a class)
                //now burn the adjacent cells
                if (me.fire_spread_mode == me.FireGrowthMode.INSTANT) {
                    var adjacent_position_array = me.get_neighbours(coord);
                    $.each(adjacent_position_array, function (i, position) {
                        me.burn(position);
                    });
                }
                return true;
            } else {
                return false;
            }
        },

        render: function () {
            this.lattice.render();
            // TODO render all properties

            this.view.tree_count.html(this.lattice.type_count('tree'));
            this.view.fire_count.html(this.lattice.type_count('fire'));
            this.view.time_step.html(this.step_count);
            this.view.f_value.html(this.get_lightning_strike_probability().toFixed(4));
            if (this.tree_growth_mode == this.TreeGrowthMode.RANDOM) {
                this.view.g_value.html(this.get_random_tree_growth_probability().toFixed(4));
            } else {
                this.view.g_value.html('?');
            }
        },

        start: function () {
            if (this.state == this.State.OFF && !this.timer) {
                this.state = this.State.ON;
//                this.stop_callback = stop_callback;
                this.log('Simulation Started');
                // TODO start lattice
                var me = this;
                this.timer = setInterval(function () {
                    me.step();
                }, this.freq);
            }
        },

        validate_input: function () {
            var lambda_valid = this.get_lambda() >= 0 && this.get_lambda() <= 1;
            if (!lambda_valid) {
                this.log('Lambda must be in the range [0,1]');
                this.stop();
            }
            this.set_lambda_error(!lambda_valid);
            return lambda_valid;
        },

        stop: function () {
            if (this.state == this.State.ON && this.timer != null) {
                this.state = this.State.OFF;
                clearInterval(this.timer);
                this.timer = null;
                this.after_stop();
                this.log('Simulation Stopped');
                if (this.stop_callback) {
                    this.stop_callback();
                }
            }
        },

        restart: function (args) {
            this.stop();
            this.lattice.destroy();
            this.init(args || this._last_args);
            this.log('Simulation Restarted');
        },

        isOn: function () {
            return this.state == this.State.ON;
        },

        set_neighbour_mode: function (mode) {
            this.neighbour_mode = mode;
            this.log('Set neighbourhood mode to ' + mode.name + '.');
        },

        set_tree_growth_mode: function (mode) {
            this.tree_growth_mode = mode;
            this.log('Set tree growth mode to ' + mode.name + '.');
        },

        set_fire_spread_mode: function (mode) {
            this.fire_spread_mode = mode;
            this.log('Set fire spread mode to ' + mode.name + '.');
        },

        set_visualise: function (state) {
            Cell.prototype.viewEnabled = state;
            if (!state) {
                this.lattice.visit(function (i, j, item) {
                    if (item) {
                        var view = item.getView();
                        if (view) {
                            view.destroy();
                        }
                    }
                });
            }
        },

        //returns an array of coords of neighbouring cells
        //the algorithm used depends on what the user has selected
        get_neighbours: function (coord) {
            if (this.neighbour_mode == this.NeighbourMode.NEUMANN) {
                return this.lattice.neumann_cells(coord);
            } else if (this.neighbour_mode == this.NeighbourMode.MOORE) {
                return this.lattice.moore_cells(coord);
            } else {
                this.log('No adjacency cell algorithm was selected.', 'error');
                return null;
            }
        },

        //returns the number of neighbouring trees, using whichever algorithm you have selected
        //this does NOT recurse, so max is either 4 or 8 depending on which algorithm you choose
        count_neighbour_type: function (coord, type) {
            var me = this;
            var count = 0;
            var neighbour_list = me.get_neighbours(coord);
            $.each(neighbour_list, function (i, item) {
                if (me.lattice.get_type(item) == type) {
                    count++;
                }
            });
            return count;
        },

        get_max_neighbour_count: function () {
            // maximum possible neighbour cell count
            // TODO put into this.NeighbourMode?
            if (this.neighbour_mode) {
                return this.neighbour_mode.max_count;
            } else {
                return null;
            }
        },

        get_random_tree_growth_probability: function () {
            var f = this.get_lightning_strike_probability();
            return f * this.get_gamma();
        },

        //Returns the growth probability of a neighbouring tree
        //This depends on which algorithm is chosen
        get_tree_growth_probability: function (coord) {
            if (this.tree_growth_mode == this.TreeGrowthMode.RANDOM) {
                return this.get_random_tree_growth_probability();
            } else if ([this.TreeGrowthMode.PROXIMITY_LINEAR, this.TreeGrowthMode.PROXIMITY_INCREASE].indexOf(this.tree_growth_mode) >= 0) {
                var count = this.count_neighbour_type(coord, 'tree');
                var max_count = this.get_max_neighbour_count();
                // TODO adjust?
                var prox_prob = this.get_proximity_prob_tree();
                var low_prob = prox_prob.low;
                var high_prob = prox_prob.high;
                if (low_prob > high_prob || low_prob < 0 || high_prob > 1) {
                    this.log('Invalid proximity probability ranges.', 'error');
                    return null;
                } else {

                    // TODO does the quadratic below change anything?
//                    if (this.tree_growth_mode == this.TreeGrowthMode.PROXIMITY_LINEAR) {
                    return low_prob + (high_prob - low_prob) * count / max_count
//                    } else if (this.tree_growth_mode == this.TreeGrowthMode.PROXIMITY_INCREASE) {
                    return low_prob + Math.pow(count * Math.pow(high_prob - low_prob, 0.5) / max_count, 2);
//                    }
                }
            } else {
                //error
                this.log('No tree growth algorithm was selected.', 'error');
                return null;
            }
        },

        get_fire_spread_probability: function (coord) {
            // TODO abstract
            var count = this.count_neighbour_type(coord, 'fire');

            // TODO fire always spreads
            if (count > 0) {
                var max_count = this.get_max_neighbour_count();
                var prox_prob = this.get_proximity_prob_fire();

//                console.log('prox_prob', prox_prob);

                // TODO overrode these
                var low_prob = prox_prob.low;
                var high_prob = prox_prob.high;
                if (low_prob > high_prob || low_prob < 0 || high_prob > 1) {
                    this.log('Invalid proximity probability ranges.', 'error');
                    return null;
                } else {
                    return low_prob + (high_prob - low_prob) * count / max_count
                }
            } else {
                // No probability of fire unless there is fire in neighbourhood
                return 0;
            }
        },

        get_clustering: function (coord) {
            return this.count_neighbour_type(coord, 'tree') / this.get_max_neighbour_count(coord);
        },

        get_lambda: function () {
            // TODO move to view?
            return this.view.lambda.val();
        },

        get_gamma: function () {
            return this.view.gamma.val();
        },

        set_lambda_error: function (error) {
            var grp = this.view.lambda.closest('.control-group');
            error ? grp.addClass('error') : grp.removeClass('error');
        },

        get_lightning_strike_probability: function () {
            // Probability of lightning strike per cell
            return this.get_lambda() / (this.lattice.cell_count());
        },

        get_proximity_prob_tree: function () {
            return {low: parseFloat(this.view.prox_low_tree.val()), high: parseFloat(this.view.prox_high_tree.val())};
        },

        get_proximity_prob_fire: function () {
            return {low: parseFloat(this.view.prox_low_fire.val()), high: parseFloat(this.view.prox_high_fire.val())};
        },

        // this function runs the actual simulation per time step
        step: function () {
            var me = this;
            var result = this.validate_input();
            if (!result) {
                return;
            }


            // TODO testing
//            this.lattice.visit(function (i, j, item) {
//                if (item && item.type == 'tree') {
//                    var coord = new Coord(i,j);
//                    var fire_probability = me.get_fire_spread_probability(coord);
//                    if (fire_probability) {
//                        console.log(coord);
//                    }
//                }
//            });
//            return;


            if (this.target && this.step_count >= this.target) {
                this.stop();
                return;
            }


            //Clear burnt trees at the start of the step!

            // TODO re-enable? No, using method above
//            this.dead_trees.pop_all(function (coord) {
//                me.lattice.set(coord, null);
//            });

            var clustering = 0;

            var new_fires = [];
            var old_fires = [];

            //loop over every cell and possibly grow a tree
            this.lattice.visit(function (i, j, item) {
                var coord = new Coord(i, j);
                var tree_probability = me.get_tree_growth_probability(coord);

                // TODO move elsewhere

                clustering += me.get_clustering(coord);
                //check if we should grow a tree here (based on probability)

                if (!item) {
                    var rand = Math.random();
                    if (rand < tree_probability) {
                        me.grow_tree(coord);
                    }
                } else {
                    var type = item.getType();
                    if (type == 'fire') {
                        old_fires.push(coord);
                    } else if (type == 'tree' && me.fire_spread_mode == me.FireGrowthMode.PROXIMITY_LINEAR) {
                        var rand = Math.random();
                        var fire_probability = me.get_fire_spread_probability(coord);
                        if (rand < fire_probability) {
                            new_fires.push(coord);
                        }
                    }
                }
            });

            $.each(old_fires, function (i, coord) {
                me.lattice.set(coord, null);
            });

            $.each(new_fires, function (i, coord) {
                me.grow_fire(coord);
            });

            var avg_clustering = clustering / this.lattice.cell_count();
            this.lattice.model.set('avg_clustering', avg_clustering);

            //loop over every cell and possibly burn a tree (and neighbouring trees)
            this.lattice.visit(function (i, j, item) {
                //check if we should burn a tree here (based on probability)
                if (Math.random() < me.get_lightning_strike_probability()) { //I hope this reseeds...
                    var coord = new Coord(i, j);
                    var tree_burnt = me.burn(coord);
                    me.lattice.model.add(tree_burnt ? 'lightning_success' : 'lightning_failure');
                }
            });

            var counts = this.lattice.model.get_model_counts();

            for (var prop in this.properties) {
                var types = this.properties[prop];
                for (var type in types) {
                    this.steps[prop][type].push(counts[type] || 0);
                }
            }

            // Remove lightning counts for the next time step
            this.lattice.model.del('lightning_success');
            this.lattice.model.del('lightning_failure');

            this.step_count++;
            this.render();
        },

        after_stop: function () {
            this.add_prop_growth({
                id: 'tree_growth',
                name: 'Tree Growth (First Order Difference)',
                steps: this.steps.types.tree
            });

            this.add_prop_growth({
                id: 'tree_growth_2',
                name: 'Tree Growth (Second Order Difference)',
                steps: this.steps.stats['tree_growth']
            });

            // Add average values for certain properties
            this.add_prop_avg({
                id: 'tree_growth_avg',
                name: 'Average Tree Growth',
                steps: this.steps.stats['tree_growth']
            });
        },

        add_prop_growth: function (prop) {
            var steps = prop.steps;
            var len = steps.length;
            var growth_steps = [];
            if (len >= 2) {
                for (var i = 0; i < len; i++) {
                    var val = 0;
                    if (i >= 1) {
                        val = steps[i] - steps[i - 1];
                    }
                    growth_steps[i] = val;
                }
            }
            this.add_prop_stats(prop, growth_steps);
        },

        add_prop_stats: function (prop, steps) {
            this.properties.stats[prop.id] = prop;
            this.steps.stats[prop.id] = steps;
        },

        add_prop_avg: function (prop) {
            var sum = 0;
            var len = prop.steps.length;
            for (var i = 0; i < len; i++) {
                sum += prop.steps[i];
            }
            var avg = sum / len;
            var avg_steps = [];
            for (var j = 0; j < len; j++) {
                avg_steps[j] = avg;
            }
            this.add_prop_stats(prop, avg_steps);
        },

        //Grows a tree at a specific location on the grid
        grow_tree: function (coord) {
            this.lattice.set(coord, new Cell('tree'));
        },

        grow_fire: function (coord) {
            this.lattice.set(coord, new Cell('fire'));
        },

        //this is a function to test some functionality of the system
        make_ten_random_trees: function () {
            this.log('Created 10 random trees');
            //This currently adds 10 random trees
            //this will crash if there are less than 10 spaces free
            var loop_count = 0;
            while (loop_count < 10) {
                loop_count++;
                var pos = this.lattice.rand_free_pos();
                var cell2 = new Cell('tree');
                this.lattice.set(pos, cell2);
                this.lattice.render();
            }
        },

        //make a square of trees in the middle (used for testing)
        make_ten_not_very_random_trees: function () {
            this.log('Created 10 non-random trees');

            for (var x = 3; x < 7; x++) {
                for (var y = 3; y < 7; y++) {
                    var pos = {i: x, j: y};
                    var cell2 = new Cell('tree');
                    this.lattice.set(pos, cell2);
                }
            }
        },

        set_logger: function (logger) {
            this.logger = logger;
        },

        log: function (msg, level) {
            if (this.logger) {
                this.logger.log(msg, level);
            }
        },

        set_freq: function (freq) {
            this.freq = freq;
        },

        get_freq: function () {
            return this.freq;
        },

        set_target: function (target) {
            this.target = target;
        },

        get_target: function () {
            return this.target;
        },

        set_size: function (size) {
            this.restart($.extend(this._last_args, {
                size: size
            }));
        },

        get_size: function () {
            return this.size;
        }

    };

    return CellAutomaton;

});

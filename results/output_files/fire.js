require([
    'src/CellAutomaton',
    'src/Coord',
    'src/LineChart',
    'src/Log'
], function (CellAutomaton, Coord, LineChart, Log) {

    // TODO move elsewhere
    function filter_fields(obj, fields) {
        var result = {};
        $.each(fields, function (i, field) {
//            console.log(field, obj);
            result[field] = $.extend({}, obj[field]);
        });
        return result;
    }

    function obj_values(data) {
        var values = [];
        for (var key in data) {
            values.push(data[key]);
        }
        return values;
    }

    function filter_values(data, fields) {
        var filtered = obj_values(filter_fields(data, fields));
        $.each(filtered, function (i, obj) {
            var count = Object.keys(obj).length;
            if (count == 0) {
               delete filtered[i];
            }
        });
        return filtered;
    }

    function get_view(ids) {
        var view = {};
        $.each(ids, function (i, id) {
            view[id] = $('#' + id);
        });
        return view;
    }

    $(function () {

        var reload_timeout;
        $(window).resize(function() {
            clearTimeout(reload_timeout);
            reload_timeout = setTimeout(function () {
//                window.location.reload();
                setup_automaton();
//                Crafty.init();
            }, 1000);
        });

        var results = $('#results');
        var cr_stage = $('#cr-stage');
        var border = $('#border');
        var left = $('.left');

        var $log = $('#log-box');
        var log = new Log($log);
        var $play_button = $('#btn-start-stop');



        // TODO horrific code
        var left_width = 0;
        var automaton;
        var setup_automaton = function () {
            var main = $('.main');
            main.width($(window).width());
            main.height($(window).height());
            left_width = $(window).width() - 340;
            left.css('width', left_width);

            var view = get_view([
                'tree_count',
                'fire_count',
                'time_step',
                'f_value',
                'g_value',
                'prox_low_tree',
                'prox_high_tree',
                'prox_low_fire',
                'prox_high_fire',
                'lambda',
                'gamma'
            ]);

            var args = {
                width: left_width,
                height: $(window).height(),
                visualise: $('#visualise').is(':checked'),
                stop_callback: function () {
                    update_play_button();
                    show_results();
                    render_charts(automaton);
                },
                view: view
            };

            if (automaton) {
                automaton.restart(args);
            } else {
                automaton = new CellAutomaton(args);
                automaton.set_logger(log);
            }
        };
        setup_automaton();

        $('#close_results').click(hide_results);

        // INPUTS

        function input_field(args) {
            args = $.extend({
                elem: null,
                elemValue: function (elem) {
                    return $(elem).val();
                },
                name: null,
                default_value: null,
                get_value: null,
                set_value: null
            }, args);

            return function () {
                var new_val = parseInt(args.elemValue(args.elem));
                if (isNaN(new_val)) {
                    args.set_value(args.default_value);
                } else if (args.get_value() != new_val) {
                    args.set_value(new_val);
                    if (args.name) {
                        log.log(args.name + ' set to ' + new_val);
                    }
                }
            };
        }

        var update_play_button = function () {
            var on = automaton.isOn();
            var $icon = $('i', $play_button);
            if (automaton.isOn()) {
                $icon.addClass('icon-pause');
                $icon.removeClass('icon-play');
            } else {
                $icon.removeClass('icon-pause');
                $icon.addClass('icon-play');
            }
        };

        var input_updates = [
            input_field({
                elem: '#freq',
                name: 'Time Step Frequency',
                get_value: function () {
                    return automaton.get_freq();
                },
                set_value: function (new_val) {
                    automaton.set_freq(new_val);
                }
            }),
            input_field({
                elem: '#target',
                name: 'Target Time-step',
                get_value: function () {
                    return automaton.get_target();
                },
                set_value: function (new_val) {
                    automaton.set_target(new_val);
                }
            }),
            input_field({
                elem: '#size',
                name: 'Lattice Size',
                get_value: function () {
                    return automaton.get_size();
                },
                set_value: function (new_val) {
                    automaton.set_size(new_val);
                    setup();
                }
            })
        ];

        var neighbour_mode_callback = function () {
            // TODO will need a revamp if we allow more than two options
            automaton.set_neighbour_mode($('#moore').is(':checked') ? automaton.NeighbourMode.MOORE : automaton.NeighbourMode.NEUMANN);
        };
        $('[name="cell_algorithm[]"]').change(neighbour_mode_callback);

        var tree_growth_callback = function () {
            var $proximity = $('#growth_proximity_tree');
            var is_proximity = $proximity.is(':checked');
            var display = is_proximity ? 'block' : 'none';
            // TODO will need a revamp if we allow more than two options
            var mode = is_proximity ? automaton.TreeGrowthMode.PROXIMITY_LINEAR : automaton.TreeGrowthMode.RANDOM;
            automaton.set_tree_growth_mode(mode);
            $('#proximity-values-tree').css('display', display);
        };
        $('[name="tree_growth[]"]').change(tree_growth_callback);

        // TODO abstract with above
        var fire_spread_callback = function () {
            var $proximity = $('#growth_proximity_fire');
            var is_proximity = $proximity.is(':checked');
            var display = is_proximity ? 'block' : 'none';
            var mode = is_proximity ? automaton.FireGrowthMode.PROXIMITY_LINEAR : automaton.FireGrowthMode.INSTANT;
            automaton.set_fire_spread_mode(mode);
            $('#proximity-values-fire').css('display', display);
        };
        $('[name="fire_spread[]"]').change(fire_spread_callback);

        var visualise_callback = function () {
            automaton.set_visualise($('#visualise').is(':checked'));
        };
        $('#visualise').change(visualise_callback);


        var CellProperties = CellAutomaton.prototype.CellProperties;
        // TODO won't work on IE
        var Types = Object.keys(CellProperties.types);
        var Events = Object.keys(CellProperties.events);

        function render_charts(automaton) {
            automaton.stop();
            show_results();
            // Transform the data into something NVD3 can use
            var chart_data = {};

            for (var prop in automaton.steps) {
                var types = automaton.steps[prop];
                for (var type in types) {
                    var record = automaton.properties[prop][type];
                    var type_obj = {
                        key: record.name,
                        values: [],
                        color: get_chart_color(prop, type, record)
                    };
                    chart_data[type] = type_obj;
                    var counts = types[type];
                    for (var i = 0; i < counts.length; i++) {
                        type_obj.values.push({x: i, y: counts[i]});
                    }
                }
            }

            // Manipulate the data into different outputs

            var pop_data = filter_values(chart_data, Types);
            var clustering_data = filter_values(chart_data, ['avg_clustering']);
            var growth_data = filter_values(chart_data, ['tree_growth', 'tree_growth_2', 'tree_growth_avg']);

            var lightning_data = filter_values(chart_data, Events);

            clear_charts();

            add_chart({
                title: 'Population Count',
                desc: 'The following chart shows the population for each cell type.',
                data: pop_data
            });

            add_chart({
                title: 'Clustering',
                desc: 'The following chart shows the percentage of average clustering. This is the ratio of neighbours to possible neighbours, based on the selected neighbourhood mode.',
                data: clustering_data
            });

            add_chart({
                title: 'Growth',
                desc: 'The following chart shows the growth of trees.',
                data: growth_data
            });

            add_chart({
                title: 'Lightning Frequency',
                desc: 'The following chart shows the frequency of lightning strikes and their success counts.',
                data: lightning_data
            });
        }

        function add_chart(args) {
            args = $.extend({
                title: null,
                desc: null,
                data: null,
                style: 'height: 300px;'
            }, args);
            var $chart = $('<div class="chart"><h3 class="title">' + args.title + '</h3><p class="desc">' + args.desc + '</p></div>');
            $('#charts').append($chart);
            // We must specify the height, else it doesn't render
            var $svg = $('<svg style="' + args.style + '"></svg>');
            $chart.append($svg);
            var chart = new LineChart($svg.get(0), args.data);
        }

        function clear_charts() {
            $('#charts').html('');
        }

        function get_chart_color(prop, type, record) {
            var colors = {
                'fire': '#f00',
                'tree': '#52af00',
                'lightning_failure': '#0096ff',
                'lightning_success': '#f0e200',
                // TODO
//                'tree_growth': '',
//                'tree_growth_2': ''
            };
            return colors[type] || null;
        }

        function show_results() {
            results.css('display', 'block');
            cr_stage.css('display', 'none');
            border.css('display', 'none');
        }

        function hide_results() {
            results.css('display', 'none');
            cr_stage.css('display', 'block');
            border.css('display', 'block');
        }

        function setup() {
            neighbour_mode_callback();
            tree_growth_callback();
            fire_spread_callback();
            visualise_callback();
            $.each(input_updates, function (i, update) {
                update();
            });
        }

        //Check when the run button is click
        $play_button.click(function () {
            setup();
            var on = automaton.isOn();
            if (on) {
                automaton.stop();
//                console.log('steps', automaton.steps);

                //Show the graphs automatically if the checkbox is checked
                //TODO: Push the checking out
                if($('#showgraph').is(':checked')) {
                    render_charts(automaton);
                }

            } else {
                hide_results();
                automaton.start();
            }
            update_play_button();
        });

        //Check when the burn button is click
        $('#btn-burn').click(function () {
            //burn a tree at (0,0) if it exists!!!
            var x = parseInt($('#burn_x').val());
            var y = parseInt($('#burn_y').val());
            var valid = Coord.prototype.is_valid(x,y)
            if (valid) {
                log.log('Burning ' + '(' + x + ',' + y + ')');
                automaton.burn(new Coord(x, y));
                automaton.render();
            } else {
                log.log('Burning requires valid coordinates');
            }
            var group = $('#btn-group');
            valid ? group.removeClass('error') : group.addClass('error');
        });


        setup();

        $('#btn-restart').click(function () {
            automaton.restart();
            setup();
            hide_results();
            update_play_button();
        });

        //Add to tooltips
        $("label, .input-prepend, .btn").tooltip();

    });


});

define([

],
    function () {

        var LineChart = function (domQuery, data) {
            this.domQuery = domQuery;
            var chart = null;

            var me = this;
            nv.addGraph(function () {
                chart = nv.models.lineChart();

                chart.x(function (d, i) {
                    return i
                });

                // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
                chart.xAxis
                    .tickFormat(d3.format(',.1f'));

                chart.yAxis
                    .axisLabel('Voltage (v)')
                    .tickFormat(d3.format(',.2f'));


                d3.select(me.domQuery)
                    //.datum([]) //for testing noData
                    .datum(data || [])
                    .transition().duration(500)
                    .call(chart);

                //TODO: Figure out a good way to do this automatically
                nv.utils.windowResize(chart.update);
                //nv.utils.windowResize(function() { d3.select('#chart1 svg').call(chart) });

                chart.dispatch.on('stateChange', function (e) {
                    nv.log('New State:', JSON.stringify(e));
                });

                return chart;
            });

        };

        LineChart.prototype = {

            // Dummy data
            sinAndCos: function () {
                var sin = [],
                    cos = [];

                for (var i = 0; i < 100; i++) {
                    sin.push({x: i, y: Math.sin(i / 10)});
                    cos.push({x: i, y: .5 * Math.cos(i / 10)});
                }

                return [
                    {
                        values: sin,
                        key: 'Sine Wave',
                        color: '#ff7f0e'
                    },
                    {
                        values: cos,
                        key: 'Cosine Wave',
                        color: '#2ca02c'
                    }
                ];
            }
        };

        return LineChart;

    });

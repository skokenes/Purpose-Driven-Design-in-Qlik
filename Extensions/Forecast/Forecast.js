/*global require, alert*/
/*
 * 
 * @owner Enter you name here (xxx)
 */
/*
 *    Fill in host and port for QlikView engine
 */
var config = {
	host: window.location.hostname,
	prefix: "/",
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port: "") + config.prefix + "resources"
} );

require( ["js/qlik","../extensions/forecast/d3.min","../extensions/forecast/senseUtils"], function ( qlikview ) {
	var qvobjects = {};
	qlikview.setOnError( function ( error ) {
		alert( error.message );
	} );
	require( ["jquery", "jqueryui"], function ( $ ) {
		//callbacks
		//open app and get objects
		var app = qlikview.openApp( "Salesforce Mashup.qvf", config);
		

		$( ".qvobject" ).each( function () {
			var qvid = $( this ).data( "qvid" );
			app.getObject( this, qvid ).then( function ( object ) {
				qvobjects[qvid] = object;
			} );
		} );
		
		createOppsForecast(app, "#container", "#container");
		/*AUTOGEN START*/
		/*
		app.createCube( {qDimensions : [
			{ qDef : {qFieldDefs : ["Region"]}},
			{ qDef : {qFieldDefs : ["Year"]}},
			{ qDef : {qFieldDefs : ["Office"]}}
			
		], qMeasures : [
			{ qDef : {qDef : "Avg([Discount])", qLabel :"Rate"}},
			{ qDef : {qDef : "Sum([Sales])", qLabel :"Sales"}}
		],qInitialDataFetch: [{qHeight: 500,qWidth: 6}]},viz);
		*/
		/*AUTOGEN END*/
	} );

} );

function createOppsForecast(app, divlocation, parent) {
    // Viz vars
    var svg, plot, x, y, y_brush, xAxis, yAxis, x_time, to_date_line, forecast_area, mid_f_line, mid_text, hi_text, lo_text, temp_amount;
    // Viz var (non updating)
    var margin, format, line, f_line, area;
    var svg_id = "opps_forecast";

    var result = {};
    result.qId_1 = '';
    result.qId_2 = '';
    result.destroy = function () { return "cube has not been loaded" };
    var status = {
        src1: 0,
        src2: 0
    };
    var src1_data, src2_data;

    // Src1
    // Create the cube
    app.createCube({
        qDimensions: [
            {
                qDef: {
                    qFieldDefs: ["Opportunity Close Date"]
                }
            }
        ],
        qMeasures: [
            {
                qDef: {
                    qDef: "sum({<[Opportunity Close Date]={'<41354'},[Opportunity Close Quarter/Year]={'Q1-13'}>}[Opportunity Won_Flag]*[Opportunity Amount]*ExRate_USD)/1000"
                }
            }
        ],
        qInitialDataFetch: [{
            qTop: 0,
            qLeft: 0,
            qHeight: 100,
            qWidth: 2
        }]
    }, function (reply) {
        result.qId_1 = reply.qInfo.qId;
        
        status.src1 = 1;
        src1_data = reply.qHyperCube.qDataPages[0].qMatrix.map(function (d) {
            return {
                date_key: d[0].qNum,
                amount: d[1].qNum
            };
        });

        src1_data.sort(function (a, b) {
            return a.date_key < b.date_key ? -1 : 1;
        });
        ready();
    });

    // Src2
    // Create the cube
    app.createCube({
        qDimensions: [
            {
                qDef: {
                    qFieldDefs: ["Opportunity Close Date"]
                }
            },
            {
                qDef: {
                    qFieldDefs: ["Opportunity Probability"]
                }
            }
        ],
        qMeasures: [
            {
                qDef: {
                    qDef: "=sum({<[Opportunity Close Date]={'>=41354<=41364'}>}[Opportunity Open_Flag]*[Opportunity Amount]*ExRate_USD)/1000"
                }
            }
        ],
        qInitialDataFetch: [{
            qTop: 0,
            qLeft: 0,
            qHeight: 31,
            qWidth: 3
        }]
    }, function (reply) {
        result.qId_2 = reply.qInfo.qId;
        
        status.src2 = 1;
        src2_data = reply.qHyperCube.qDataPages[0].qMatrix.map(function (d) {
            return {
                date_key: d[0].qNum,
                probability: d[1].qNum,
                amount: d[2].qNum
            };
        });
        ready();
    });

    function ready() {
        if (status.src1 + status.src2 === 2) {
            
            viz();
            setResult();
            // reset sources at the end of viz code
            status.src1 = 0;
            status.src2 = 0;
        }
        else {
            
        }
    }

    function viz() {
        
        // non updating vars
        margin = {
                top: 40,
                left: 50,
                right: 100+200,
                bottom: 30
            },
        format = d3.format(",.0f"),
        line = d3.svg.line()
                .x(function (d) { return x(d.date_key); })
                .y(function (d) { return y(d.to_date); })
                .interpolate("monotone"),
        f_line = d3.svg.line()
                .x(function (d) { return x(d.date_key); })
                .y(function (d) { return y(d.mid_est); }),
        area = d3.svg.area()
            .x(function (d) { return x(d.date_key); })
            .y0(function (d) { return y(d.low_est); })
            .y1(function (d) { return y(d.high_est); });

        var baseline_data =[];
        // Build the entire day range
        var start = 41275;
        var startDate = new Date(2013,0,1);
        var end = 41364;

        var i = start;
        temp_amount = 0;
        while (i <= end) {
            var temp_date = new Date(startDate);
            temp_date.setDate(startDate.getDate() + i-start);
            baseline_data.push({
                date_key: i,
                date_val: temp_date,
                date_disp: (temp_date.getMonth() + 1) + "/" + temp_date.getDate(),
                to_date: temp_amount + getPropVal(src1_data,"date_key",i,"amount")
            });
            temp_amount = temp_amount + getPropVal(src1_data, "date_key", i, "amount")
            i++;
        }

        // Calc max possible amount
        var max = temp_amount + d3.sum(src2_data, function (d) { return d.amount });

        // Based on current variable settings, filter the src2 data set and nest
        var low_est_param = .25;
        var high_est_param = .75;
        var mid_est_param = (high_est_param + low_est_param) / 2;
        //console.log(src2_data.filter(function (d) { return d.probability >= (1 - low_est_param) }));
        var low_est_data = d3.nest()
                            .key(function (d) { return d.date_key })
                            .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; })})
                            .entries(src2_data.filter(function (d) { return d.probability >= (1 - low_est_param) }));
        
        var high_est_data = d3.nest()
                            .key(function (d) { return d.date_key })
                            .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; }) })
                            .entries(src2_data.filter(function (d) { return d.probability >= (1 - high_est_param) }));
        var mid_est_data = d3.nest()
                            .key(function (d) { return d.date_key })
                            .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; }) })
                            .entries(src2_data.filter(function (d) { return d.probability >= (1 - mid_est_param) }));

        // build forecast data
        var forecast_data = baseline_data.filter(function (d) { return d.date_key >= 41354 });
        var present_data = baseline_data.filter(function (d) { return d.date_key < 41354 });

        var last_present_point = present_data.slice(-1)[0];
        var last_point = forecast_data.slice(-1)[0];

        var low_est_tot = temp_amount;
        var high_est_tot = temp_amount;
        var mid_est_tot = temp_amount;
        var temp_key = 41354;
        forecast_data.forEach(function (d) {
            d.low_est = low_est_tot + getPropVal(low_est_data, "key", temp_key.toString(), "values");
            d.high_est = high_est_tot + getPropVal(high_est_data, "key", temp_key.toString(), "values");
            d.mid_est = mid_est_tot + getPropVal(mid_est_data, "key", temp_key.toString(), "values");
            low_est_tot = d.low_est;
            high_est_tot = d.high_est;
            mid_est_tot = d.mid_est;
            temp_key = temp_key + 1;
        });

        // chart properties
        var chart_width = $(parent).width(),
            chart_height = $(parent).height(),
            plot_width = chart_width - margin.left - margin.right,
            plot_height = chart_height - margin.top - margin.bottom;

        if (document.getElementById(svg_id)) {
            var dur = 1000;
            // Update scales
            y.domain([0, max]);
            x.domain(d3.extent(baseline_data, function (d) { return d.date_key; }));
            x_time.domain([d3.min(baseline_data, function (d) { return d.date_val }), d3.max(baseline_data, function (d) { return d.date_val })]);
            // Update sizing
            svg
                .attr("width", chart_width)
                .attr("height", chart_height);
            // Animate line changes
            to_date_line
                        .datum(present_data)
                        .transition()
                        .duration(dur)
                        .attr("d", line);
            // area
            forecast_area
                        .datum(forecast_data)
                        .transition()
                        .duration(dur)
                        .attr("d", area);
            // mid est line
            mid_f_line
                        .datum(forecast_data)
                        .transition()
                        .duration(dur)
                        .attr("d", f_line);
            // add dot
            plot.select("#to_date")
                .transition()
                .duration(dur)
                .attr("cx", x(last_present_point.date_key))
                .attr("cy", y(last_present_point.to_date));

            var degrees = 30;
            var radians = degrees * Math.PI / 180;
            // add ytd annotation
            plot.select("#ytd_ann_line")
                .transition()
                .duration(dur)
                .attr("x1", x(last_present_point.date_key) - 3)
                .attr("y1", y(last_present_point.to_date) - 3)
                .attr("x2", x(last_present_point.date_key) - Math.cos(radians) * 50)
                .attr("y2", y(last_present_point.to_date) - Math.sin(radians) * 50);

            plot.select("#ytd_text")
                .transition()
                .duration(dur)
                .attr("x", x(last_present_point.date_key) - Math.cos(radians) * 50 - 5)
                .attr("y", y(last_present_point.to_date) - Math.sin(radians) * 50)
                .attr("text-anchor", "end")
                .text("YTD: " + format(last_present_point.to_date));

            // add dot
            plot.select("#last_date")
                .transition()
                .duration(dur)
                .attr("cx", x(last_point.date_key))
                .attr("cy", y(last_point.mid_est));

            // add text
            mid_text
                .text(format(last_point.mid_est) + "")
                .transition()
                .duration(dur)
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.mid_est));

            // add text
            hi_text
                .text("hi: " + format(last_point.high_est))
                .transition()
                .duration(dur)
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.high_est));

            // add text
            lo_text
                .text("lo: " + format(last_point.low_est))
                .transition()
                .duration(dur)
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.low_est))
                .each("end", labelCheck);

            plot.selectAll(".y.axis").transition().duration(dur).call(yAxis);
        }
        else {
            // Create scales
            y = d3.scale.linear()
                        .domain([0, max])
                        .range([plot_height, 0]);
            
            x = d3.scale.linear()
                        .domain(d3.extent(baseline_data, function (d) { return d.date_key; }))
                        .range([0, plot_width]);
            x_time = d3.time.scale()
                .domain([d3.min(baseline_data, function (d) { return d.date_val }), d3.max(baseline_data, function (d) { return d.date_val })])
                .range([0, plot_width]);
            xAxis = d3.svg.axis()
                    .scale(x_time)
                    //.tickSize(0)
                    .ticks(6)
                    .tickFormat(d3.time.format("%b %d"));
            yAxis = d3.svg.axis()
                        .scale(y)
                        .ticks(4)
                        .orient("left");

            // draw the chart
            svg = d3.select(divlocation).append("svg")
                        .attr("id", svg_id)
                        .attr("width", chart_width)
                        .attr("height", chart_height);
            plot = svg.append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            to_date_line = plot.append("path")
                              .datum(present_data)
                              .attr("class", "present_line")
                              .attr("d", line);

                // area
            forecast_area = plot.append("path")
                                    .datum(forecast_data)
                                    .attr("d", area)
                                    .attr("class", "forecast_area");
                // mid est line
            mid_f_line = plot.append("path")
                                  .datum(forecast_data)
                                  .attr("class", "mid_line")
                                  .attr("d", f_line);

                // add dot
            plot.append("circle")
                .attr("cx", x(last_present_point.date_key))
                .attr("cy", y(last_present_point.to_date))
                .attr("r", 3)
                .attr("id", "to_date")

            var degrees = 30;
            var radians = degrees * Math.PI / 180;
            // add ytd annotation
            plot.append("line")
                .attr("id", "ytd_ann_line")
                .attr("class","ytd_ann")
                .attr("x1", x(last_present_point.date_key)-3)
                .attr("y1", y(last_present_point.to_date)-3)
                .attr("x2", x(last_present_point.date_key) - Math.cos(radians) * 50)
                .attr("y2", y(last_present_point.to_date) - Math.sin(radians) * 50);

            plot.append("text")
                .attr("id", "ytd_text")
                .attr("class", "ytd_ann")
                .attr("x", x(last_present_point.date_key) - Math.cos(radians) * 50 - 5)
                .attr("y", y(last_present_point.to_date) - Math.sin(radians) * 50)
                .attr("text-anchor", "end")
                .text("YTD: " + format(last_present_point.to_date));

                // add dot
            plot.append("circle")
                .attr("cx", x(last_point.date_key))
                .attr("cy", y(last_point.mid_est))
                .attr("r", 3)
                .attr("id", "last_date")

                // add text
            mid_text = plot.append("text")
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.mid_est))
                .attr("dy", '.3em')
                .attr("id", "last_date_text")
                .text(format(last_point.mid_est) + "");

                // add text
            hi_text = plot.append("text")
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.high_est))
                .attr("dy", '.3em')
                .attr("class", "boundary_text")
                .text("hi: " + format(last_point.high_est));

                // add text
            lo_text = plot.append("text")
                .attr("x", x(last_point.date_key) + 7)
                .attr("y", y(last_point.low_est))
                .attr("dy", '.3em')
                .attr("class", "boundary_text")
                .text("lo: " + format(last_point.low_est));

            // x axis
            plot.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + plot_height + ")")
                .call(xAxis);

            // y axis
            plot.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(0," + 0 + ")")
                .call(yAxis);

            // Brush

            var brush_width = 8;
            var brush_margin = {
                top: 50,
                bottom: 80
            };
            var brush_height = chart_height - brush_margin.top - brush_margin.bottom;
            y_brush = d3.scale.linear()
                        .domain([0, 1])
                        .range([brush_height, 0]);
            // create brush
            var brush = d3.svg.brush()
                .y(y_brush)
                .extent([.35, .75])
                .on("brush", brushmove);

            var center_distance = margin.right / 2 - 30;
            // append line
            var brush_outline = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", brush_height)
                .attr("class", "b_outline")
                .attr("transform", "translate(" + (chart_width - center_distance+4) + "," + brush_margin.top + ")");

            var brush_line = svg.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", brush_height)
                .attr("class", "halo")
                .attr("transform", "translate(" + (chart_width - center_distance + 4) + "," + brush_margin.top + ")");

            var brush_format = d3.format(",%");
            // append brush
            var brushg = svg.append("g")
                .attr("class", "brush")
                .attr("transform", "translate(" + (chart_width - center_distance) + "," + brush_margin.top + ")")
                .call(brush);
            
            // brush handles
            brushg.selectAll(".resize").append("circle")
                .attr("transform", "translate(" + brush_width/2 + ",0)")
                .attr("r", 10);

            // mod rect
            brushg.selectAll("rect")
                  .attr("width", brush_width);
            // mod background
            brushg.selectAll(".background")
                   .attr("width", brush_width);

            brushg.selectAll("text")
                .data(brush.extent())
                .enter()
                .append("text")
                .attr("class", "brush label")
                .attr("x",-10)
                .attr("y", function (d) { return y_brush(d) })
                .attr("dy",".35em")
                .text(function(d) {return brush_format(d)});

            // brush function
            function brushmove() {
                var s = brush.extent();
                brushg.selectAll("text")
                    .data(s)
                    .attr("y", function (d) { return y_brush(d) })
                    .text(function (d) { return brush_format(d) });
                buildForecast(s);
            }

            var f_ann = svg.append("text")
                .attr("x", chart_width)
                .attr("y", chart_height - 50)
                .attr("text-anchor", "end")
                .style("font-size","10px");
               
            f_ann.append("tspan")
                .attr("x", chart_width)
                .attr("dy", "1.2em")
                .attr("id","ann_hi")
                .text("Hi forecast: deals with a probability from " + Math.round((1-brush.extent()[1])*100) + "%-100%");
            f_ann.append("tspan")
                .attr("x", chart_width)
                .attr("dy", "1.2em")
                .attr("id","ann_lo")
                .text("Lo forecast: deals with a probability from " + Math.round((1 - brush.extent()[0]) * 100) + "%-" + "100%");
               // .text("The high forecast consists of deals with a probability from 100% to 25%; the low forecast includes deals with a probability from 100% to 75%");

            // rebuild forecast data
            function buildForecast(s) {
                // Based on current variable settings, filter the src2 data set and nest
                low_est_param = s[0];
                high_est_param = s[1];
                mid_est_param = (high_est_param + low_est_param) / 2;
                //console.log(src2_data.filter(function (d) { return d.probability >= (1 - low_est_param) }));
                low_est_data = d3.nest()
                                    .key(function (d) { return d.date_key })
                                    .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; }) })
                                    .entries(src2_data.filter(function (d) { return d.probability >= (1 - low_est_param) }));

                high_est_data = d3.nest()
                                    .key(function (d) { return d.date_key })
                                    .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; }) })
                                    .entries(src2_data.filter(function (d) { return d.probability >= (1 - high_est_param) }));
                mid_est_data = d3.nest()
                                    .key(function (d) { return d.date_key })
                                    .rollup(function (leaves) { return d3.sum(leaves, function (d) { return d.amount; }) })
                                    .entries(src2_data.filter(function (d) { return d.probability >= (1 - mid_est_param) }));

                // build forecast data
                forecast_data = baseline_data.filter(function (d) { return d.date_key >= 41354 });
                present_data = baseline_data.filter(function (d) { return d.date_key < 41354 });

                last_present_point = present_data.slice(-1)[0];
                last_point = forecast_data.slice(-1)[0];

                low_est_tot = temp_amount;
                high_est_tot = temp_amount;
                mid_est_tot = temp_amount;
                temp_key = 41354;
                forecast_data.forEach(function (d) {
                    d.low_est = low_est_tot + getPropVal(low_est_data, "key", temp_key.toString(), "values");
                    d.high_est = high_est_tot + getPropVal(high_est_data, "key", temp_key.toString(), "values");
                    d.mid_est = mid_est_tot + getPropVal(mid_est_data, "key", temp_key.toString(), "values");
                    low_est_tot = d.low_est;
                    high_est_tot = d.high_est;
                    mid_est_tot = d.mid_est;
                    temp_key = temp_key + 1;
                });

                var dur = 100;
                // area
                forecast_area
                            .datum(forecast_data)
                            .transition()
                            .ease("linear")
                            .duration(dur)
                            .attr("d", area);
                // mid est line
                mid_f_line
                            .datum(forecast_data)
                            .transition()
                            .ease("linear")
                            .duration(dur)
                            .attr("d", f_line);
                // add dot
                plot.select("#last_date")
                    .transition()
                    .ease("linear")
                    .duration(dur)
                    .attr("cx", x(last_point.date_key))
                    .attr("cy", y(last_point.mid_est));

                // add text
                mid_text
                    .text(format(last_point.mid_est) + "")
                    .transition()
                    .ease("linear")
                    .duration(dur)
                    .attr("x", x(last_point.date_key) + 7)
                    .attr("y", y(last_point.mid_est));

                // add text
                hi_text
                    .text("hi: " + format(last_point.high_est))
                    .transition()
                    .ease("linear")
                    .duration(dur)
                    .attr("x", x(last_point.date_key) + 7)
                    .attr("y", y(last_point.high_est));

                // add text
                lo_text
                    .text("lo: " + format(last_point.low_est))
                    .transition()
                    .ease("linear")
                    .duration(dur)
                    .attr("x", x(last_point.date_key) + 7)
                    .attr("y", y(last_point.low_est))
                    .each("end", labelCheck);

                f_ann.select("#ann_hi")
                    .text("Hi forecast: deals with a probability from " + Math.round((1 - s[1]) * 100) + "%-100%");
                f_ann.select("#ann_lo")
                    .text("Lo forecast: deals with a probability from "  + Math.round((1 - s[0]) * 100) + "%-100%");
            }

            svg.append("text")
                .attr("x", chart_width - center_distance)
                .attr("y", 20)
                .attr("id","adjust_text")
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .attr("dy",".5em")
                .text("Adjust forecast");

            // title
            var title = svg.append("text")
                            .attr("x", 10)
                            .attr("y", 20)
                            .attr("dy", ".3em")
                            .style("font-size", "16px")
                            .text("Daily Cumulative Value of Deals ($K)");
            // legend
            var leg_g = svg.append("g")
                            .attr("transform", "translate(" + (margin.left + 250) + ",20)");
            
            var leg_line = leg_g.append("line")
                            .attr("class", "legend")
                            .attr("x1", 0)
                            .attr("x2", 10)
                            .attr("y1", 0)
                            .attr("y2", 0);
            var leg_circ = leg_g.append("circle")
                                .attr("class", "legend td")
                                .attr("cx", 13)
                                .attr("cy", 0)
                                .attr("r", 3);
            leg_g.append("text")
                    .attr("class", "legend td")
                    .attr("x", 20)
                    .attr("y", 0)
                    .attr("dy", ".3em")
                    .text("YTD");

            leg_g.append("rect")
                    .attr("class", "legend f")
                    .attr("x", 70)
                    .attr("y", -5)
                    .attr("height", 10)
                    .attr("width", 10);

            leg_g.append("text")
                    .attr("class", "legend f")
                    .attr("x", 85)
                    .attr("y", 0)
                    .attr("dy", ".3em")
                    .text("forecast range");

            leg_g.append("line")
                            .attr("class", "legend m")
                            .attr("x1", 190)
                            .attr("x2", 200)
                            .attr("y1", 0)
                            .attr("y2", 0);

            leg_g.append("circle")
                                .attr("class", "legend f")
                                .attr("cx", 203)
                                .attr("cy", 0)
                                .attr("r", 3);

            leg_g.append("text")
                    .attr("class", "legend m")
                    .attr("x", 210)
                    .attr("y", 0)
                    .attr("dy", ".3em")
                    .text("mid range estimate");

            labelCheck();

            if(chart_width<(540-50)) {
                svg.selectAll(".x.axis text").attr("opacity", 0);
            }
            else {
                svg.selectAll(".x.axis text").attr("opacity", 1);
            }

            if (chart_width < (840-50)) {
                svg.select("#adjust_text").attr("opacity", 0);
            }
            else {
                svg.select("#adjust_text").attr("opacity", 1);
            }

            if (chart_width < (530-50)) {
                svg.selectAll(".ytd_ann").attr("opacity", 0);
            }
            else {
                svg.selectAll(".ytd_ann").attr("opacity", 1);
            }
        }
 

        
        function labelCheck() {

            if ((hi_text[0][0].offsetTop + hi_text[0][0].offsetHeight) > mid_text[0][0].offsetTop) {
                hi_text.attr("opacity", 0);
            }
            else {
                hi_text.attr("opacity", 1);
            };

            if ((mid_text[0][0].offsetTop + mid_text[0][0].offsetHeight) > lo_text[0][0].offsetTop) {
                lo_text.attr("opacity", "0");
            }
            else {
                lo_text.attr("opacity", 1);
            };
        }
        


        
    }

    function getPropVal(arr, key_prop, key, prop) {
        var result = 0;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i][key_prop] === key) {
                result = arr[i][prop];
            };
        }
        return result;
    }

    function setResult() {
        result.destroy = function () {
            var json1 = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "DestroySessionObject",
                "handle": 1,
                "params": [
                  reply.qInfo.qId_1
                ]
            };
            var json_string1 = JSON.stringify(json1);
            app.model.session.socket.send(json_string1);
            var json2 = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "DestroySessionObject",
                "handle": 1,
                "params": [
                  reply.qInfo.qId_2
                ]
            };
            var json_string2 = JSON.stringify(json2);
            app.model.session.socket.send(json_string2);
            $("#" + svg_id).remove();
        }
    };

    /*
    window.addEventListener('resize', function (event) {
        //var data = d3.selectAll(".stagebars").data(); //gets the data bound to the current chart
        if (document.getElementById(svg_id)) {
            d3.select("#" + svg_id).remove();
            viz();
        }
    });
	*/

    return result;
}
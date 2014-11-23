define(["jquery", "text!./updatingbar.css","./d3.min"], function($, cssContent) {'use strict';
	$("<style>").html(cssContent).appendTo("head");
	return {
		initialProperties : {
			version: 1.0,
			qHyperCubeDef : {
				qDimensions : [],
				qMeasures : [],
				qInitialDataFetch : [{
					qWidth : 2,
					qHeight : 1000
				}]
			}
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
				dimensions : {
					uses : "dimensions",
					min : 1,
					max:1
				},
				measures : {
					uses : "measures",
					min : 1,
					max:1
				},
				sorting : {
					uses : "sorting"
				},
				settings : {
					uses : "settings"			
				}
			}
		},
		snapshot : {
			canTakeSnapshot : true
		},
		paint : function($element,layout) {
			// Create a reference to the app, which will be used later to make selections
			var self = this;

			// Get the data
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			var data = qMatrix.map(function(d) {
				return {
					"Dim":d[0].qText,
					"Dim_key":d[0].qElemNumber,
					"Value":d[1].qNum
				}
			});

			// Get the extension container properties
			var ext_height = $element.height(), // height
				ext_width = $element.width(),   // width
				ext_id = "ext_" + layout.qInfo.qId; // chart id


			// Create or empty the chart container
			if(document.getElementById(ext_id)) {
			}
			else {
				// If the element doesn't exist, create it
				$element.append($("<div />").attr("id",ext_id).width(ext_width).height(ext_height));
			}

			// Call the visualization function
			viz();

			function viz() {
				var div,svg,plot,x,y,xAxis,yAxis;
				// define margins
				var margin = {
					top:10,
					left:30,
					right:10,
					bottom:20
				};

				// Plot dimensions
				var plot_width = ext_width - margin.left - margin.right,
					plot_height = ext_height - margin.top - margin.bottom;

				// Get the div
				div = d3.select("#" +ext_id);

				// If the svg exists, update it's dimensions. This requires adjusting the scale and axes dimensions as well.
				if(document.getElementById(ext_id + "_svg")) {
					// update svg dimensions
					svg = div.select("svg")
						.attr("width",ext_width)
						.attr("height",ext_height);
					plot = svg.select("#" + ext_id +"_svg_g");

					// Get scales and axes and update. The scales and axes are stored on the div container element
					x = div.datum().x
						.domain([0,d3.max(data,function(d) {return d.Value})])
						.range([0,plot_width]);
					y = div.datum().y
						.domain(data.map(function(d) {return d.Dim}))
						.rangeRoundBands([0, plot_height], .25);
					xAxis = div.datum().xAxis;
					yAxis = div.datum().yAxis;
				}
				else {
					// if the svg doesn't exist, initialize it and the components like the scales and axes
					// Scales
					x = d3.scale.linear()
							.domain([0,d3.max(data,function(d) {return d.Value})])
							.range([0,plot_width]),
					y = d3.scale.ordinal()
							.domain(data.map(function(d) {return d.Dim}))
							.rangeRoundBands([0, plot_height], .25),
					xAxis = d3.svg.axis()
								.scale(x)
								.tickSize(5)
								.tickFormat(d3.format(",.0f")),
					yAxis = d3.svg.axis()
							.scale(y)
							.orient("left");

					// Append an svg element to the container. Add a group to it that is transformed by the margins for the plot area
					svg = div.append("svg")
								.attr("width",ext_width)
								.attr("height",ext_height)
								.attr("id",ext_id + "_svg");

					plot = svg
								.append("g")
								.attr("id",ext_id+"_svg_g");
					
					// Add this initialized data to the div container element. This will allow us to pull the data as a reference when updating	
					var scale_datum = {
						x:x,
						y:y,
						xAxis:xAxis,
						yAxis:yAxis
					};
					div.datum(scale_datum);
				}
	
				// Create a temporary yAxis to get the width needed for labels and add to the margin
				svg.append("g")
					.attr("class","y axis temp")
					.attr("transform","translate(0," + 0 + ")")
					.call(yAxis);

				var label_width = d3.max(svg.selectAll(".y.axis.temp text")[0], function(d) {return d.clientWidth});

				svg.selectAll(".y.axis.temp").remove();

				margin.left = margin.left + label_width;

				// Get the bar height from the y scale range band
				var bar_height = y.rangeBand();
	
				// Transition duration
				var dur = 750;

				// Add the bars to the plot area
				// Add the data first, with a key
				var bars = plot.selectAll(".updatingbar") 
							.data(data,function(d) {return d.Dim});
			
				// Update logic 
				var updatedBars = bars
									.transition()
									.duration(dur)
									.delay(!bars.exit().empty() * dur)
									.attr("y",function(d) {return y(d.Dim)})
									.attr("width",function(d) {return x(d.Value)})
									.attr("height",bar_height)
									.attr("opacity",1);
				
				// Enter logic
				bars
					.enter()
					.append("rect")
					.attr("class","updatingbar")
					.attr("x",0)
					.attr("y",function(d) {return y(d.Dim)})
					.attr("opacity",0)
					.attr("height",bar_height)
					.attr("width",function(d) {return x(d.Value)})
					.on("click",function(d) {self.backendApi.selectValues(0,[d.Dim_key],true);})
					.transition()
					.duration(dur)
					.delay((!bars.exit().empty() + !updatedBars.empty()) * dur)
					.attr("opacity",1);

				// Exit logic
				bars
					.exit()
					.transition()
					.duration(dur)
					.attr("opacity",0)
					.remove();

				// Adjust the plot area for the labels
				plot
					.transition()
					.duration(dur)
					.delay(!bars.exit().empty() * dur)
					.attr("transform","translate(" + margin.left + "," + margin.top + ")");

				// If the y axis exists doesn't exist, create it. Otherwise, transition it
				if (plot.selectAll(".y.axis").empty()) {
					plot.append("g")
						.attr("class","y axis")
						.attr("id",ext_id + "_y_g")
						.attr("transform","translate(0," + 0 + ")")
						.call(yAxis);
				}
				else {
					plot.selectAll(".y.axis")
						.transition()
						.duration(dur)
						.delay(!bars.exit().empty() * dur)
						.call(yAxis);
				}

				// If the x axis exists doesn't exist, create it. Otherwise, transition it
				if (plot.selectAll(".x.axis").empty()) {
					plot.append("g")
						.attr("class","x axis")
						.attr("id",ext_id + "_x_g")
						.attr("transform","translate(0," + plot_height + ")")
						.call(xAxis);
				}
				else {
					// retranslate x axis
					plot.select("#" + ext_id + "_x_g")
						.attr("transform","translate(0," + plot_height + ")");
					plot.selectAll(".x.axis")
						.transition()
						.duration(dur)
						.delay(!bars.exit().empty() * dur)
						.call(xAxis);
				}

				// Add a click function to the y axis
				plot.selectAll(".y.axis .tick")
					.on("click",function(d) {self.backendApi.selectValues(0,[getProp(data,"Dim",d,"Dim_key")],true);})
			}
		}
	};
});

// Helper functions
function getProp(array,source_prop,source_val,target_prop) {
	var output;
	for (var i =0; i<=array.length;i++) {
		if(array[i][source_prop]==source_val) {
			output = array[i][target_prop];
			break;
		}
	}
	return output;
}

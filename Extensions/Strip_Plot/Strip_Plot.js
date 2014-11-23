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

require( ["js/qlik","../extensions/Strip_Plot/d3.min"], function ( qlikview ) {
	var qvobjects = {};
	qlikview.setOnError( function ( error ) {
		alert( error.message );
	} );
	require( ["jquery", "jqueryui"], function ( $ ) {
		//callbacks
		//open app and get objects
		var app = qlikview.openApp( "Strip Plot Example.qvf", config);
		

		$( ".qvobject" ).each( function () {
			var qvid = $( this ).data( "qvid" );
			app.getObject( this, qvid ).then( function ( object ) {
				qvobjects[qvid] = object;
			} );
		} );
		
		/*AUTOGEN START*/
		app.createCube( {qDimensions : [
			{ qDef : {qFieldDefs : ["Region"]}},
			{ qDef : {qFieldDefs : ["Year"]}},
			{ qDef : {qFieldDefs : ["Office"]}}
			
		], qMeasures : [
			{ qDef : {qDef : "Avg([Discount])", qLabel :"Rate"}},
			{ qDef : {qDef : "Sum([Sales])", qLabel :"Sales"}}
		],qInitialDataFetch: [{qHeight: 500,qWidth: 6}]},viz);
		/*AUTOGEN END*/
	} );

} );


  function viz(reply) {
  	var data = transformData(reply.qHyperCube);
  	console.log(reply);
  	console.log(data);
  	paint(data,reply);

	};



  function transformData(input) {
  	
  	var dim_headers= (input.qDimensionInfo.map(function(d) {return d.qFallbackTitle}));
  	var expr_headers= (input.qMeasureInfo.map(function(d) {return d.qFallbackTitle}));
  	var headers=dim_headers.concat(expr_headers);

  	// Raw data
  	var data = [];
  	input.qDataPages[0].qMatrix.forEach(function(d) {
  		var temp_obj={};
  		for (var i=0; i<dim_headers.length;i++) {
  			temp_obj[headers[i]]=(d[i].qNum=="NaN") ? d[i].qText : d[i].qNum;
  		}
  		temp_obj.value = d[dim_headers.length].qNum;
  		temp_obj.size = d[(dim_headers.length+1)].qNum;
  		temp_obj.key = (d[2].qNum=="NaN") ? d[2].qText : d[2].qNum;
  		data.push(temp_obj);
  	});

  	// Nested data
  	var nested_data = d3.nest()
  		.key(function(d) {return d[headers[0]]})
  		.key(function(d) {return d[headers[1]]})
  		.entries(data);


  	// Path data
	item_list= [];
	item_factor=[];
	path_data = [];
	nested_data.forEach(function(d) {
		cur_key_1 = d.key;
		d.values.forEach(function(e) {
			e.values.forEach(function(f) {
				cur_key_3 = f[dim_headers[2]];
				cur_fact = Math.random();
				if(item_list.indexOf(cur_key_3)==-1) {
					item_list.push(cur_key_3);
					item_factor.push({"key":cur_key_3,"value":cur_fact})
					path_data.push(
						{"key_3":cur_key_3,
						"value_1":f.value,
						"year_1":f[dim_headers[1]],
						"size_1":f.size,
						"factor":cur_fact,
						"key_1":cur_key_1
						}
					);
				}
				else {
					path_data[item_list.indexOf(cur_key_3)].value_2 = f.value;
					path_data[item_list.indexOf(cur_key_3)].year_2 = f[dim_headers[1]];
					path_data[item_list.indexOf(cur_key_3)].size_2 = f.size;
				}
			})
			
		})
		
	});
	
  	return {"nested":
  				{"keys":{
  						"all":headers,
  						"dim":dim_headers,
  						"expr":expr_headers
  					},
  				"data":nested_data,
  				"item_list":item_list,
  				"item_factor":item_factor
  				},
  			"paths":path_data};
 	};

  function paint(input_data,layout) {

  	var data= input_data.nested.data;
  	var headers = input_data.nested.keys.all;
  	var path_data = input_data.paths;
  	var item_list = input_data.nested.item_list;
  	var item_factor = input_data.nested.item_factor;

  	// Chart Properties
	var chart_height = 338;
	var chart_width = 413;
	var chart_margin = 	{
					"top":20,
					"left":30,
					"right":20,
					"bottom":10
				};

	// Format
	var percFormat = d3.format('%');
	var commaFormat = d3.format(',');

	// Legend properties
	var legend_height = 88;

	// Expression Ranges
	var max_size = d3.max(data,function (d) {
		return d3.max(d.values,function(e) {
			return d3.max(e.values,function(f) {
				return f.size;
			})
		})
	});

	var min_size = d3.min(data,function (d) {
		return d3.min(d.values,function(e) {
			return d3.min(e.values,function(f) {
				return f.size;
			})
		})
	});

	var max_value = d3.max(data,function (d) {
		return d3.max(d.values,function(e) {
			return d3.max(e.values,function(f) {
				return f.value;
			})
		})
	});

	var min_value = d3.min(data,function (d) {
		return d3.min(d.values,function(e) {
			return d3.min(e.values,function(f) {
				return f.value;
			})
		})
	});

	var max_year = d3.max(data,function(d) {
		return d3.max(d.values,function(e) {
			return e.key;
		})
	});

	var min_year = d3.min(data,function(d) {
		return d3.min(d.values,function(e) {
			return e.key;
		})
	});

	// DOM
	var container = d3.select("#container").html('');
	// caption
	var caption = container.append("div").attr("id","caption");
	caption.append("span")
		.attr("id","title")
		.html(headers[2] + " Analysis");
	caption.append("span")
		.attr("id","subtitle")
		.html("year over year comparison of discount rates");
	caption
		.append("input")
		.attr("type","checkbox")
		.attr("id","c1");
	caption
		.append("label")
			.attr("for","c1")
			.html("highlight " + headers[2].toLowerCase() + "s with a variance greater than");

	// slider
	var slider_value = 0;
	var slider_width = 412;
	var slider_height = 32;

	var slider_x = d3.scale.linear()
	    .domain([0, 100])
	    .range([0, slider_width-80])
	    .clamp(true);

	var brush = d3.svg.brush()
	    .x(slider_x)
	    .extent([0, 0])
	    .on("brush", brushed);
	// graph div
    var graph_div = container.append("div")
    	.attr("id","graph_cont");
	// slidernsvg
	var slider_svg = graph_div.append("svg")
		.attr("width",slider_width)
		.attr("height",slider_height)
		.attr("id","slider_svg")
		.append("g")
    	.attr("transform", "translate(" + 20 + "," + 0 + ")");;

    // svg
	var svg = graph_div.append("svg")
		.attr("width",chart_width)
		.attr("height",chart_height);

	svg.append("rect")
		.attr("width",chart_width)
		.attr("height",chart_height)
		.attr("opacity",0);

	// y-labels
	var labels = svg.selectAll("labels")
		.data([min_year,max_year])
		.enter()
		.append("text")
		.attr("class","labels")
		.attr("dy",".3em")
		.attr("text-anchor","end")
		.attr("transform","translate(" + 0 + "," + chart_margin.top + ")")
		.text(function(d) {return d});

	var label_size = d3.max(labels[0],function(d) {return d.clientWidth});

	// reset chart left margin based on label size
	chart_margin.left = label_size+chart_margin.left;

	var no_key_1 = data.length;
	var no_years = data[0].values.length;

	//buble sizing
	var min_r = 3.75;
	var max_r = 12.5;

	var min_a = rToA(min_r);
	var max_a = rToA(max_r);

	// Bubble area scale
	var a_scale = d3.scale.linear()
		.domain([min_size,max_size])
		.range([min_a,max_a]);

	// X-scale
	var x_scale = d3.scale.linear()
		.domain([.8*min_value,1.1*max_value])
		.range([0,chart_width-chart_margin.left-chart_margin.right]);

	// year scale
	var yr_scale = d3.scale.linear()
		.domain([min_year,max_year])
		.rangeRound([0,no_years-1]);

	// X-axis
	var xAxis = d3.svg.axis()
    .scale(x_scale)
    .orient("top")
    .tickSize(5)
    .tickFormat(percFormat);

    // Zoom
	var zoom = d3.behavior.zoom()
    .x(x_scale)
    .scaleExtent([1, 10])
    .on("zoom", zoomed);

    svg.call(zoom);

    // Chart spacing
    var plot_tot_height = chart_height - chart_margin.top - chart_margin.bottom - legend_height;
	var year_height = plot_tot_height/no_years;
	var year_margin = {
		"top":25,
		"bottom":25,
		"left":0,
		"right":0
	}

	var year_space = year_height - year_margin.top - year_margin.bottom;

	// position labels
	labels
		.attr("y",function(d,i){return (i+.5)*year_height})
		.attr("x",chart_margin.left-20);
	
	// Colors
	var cBill = d3.rgb("#21618C");
	var cGrey = d3.rgb("#C6C6C6");
	var cRed = d3.rgb("#F26A4E");
    var cYellow = d3.rgb("#F3CB66");
	var cGreen = d3.rgb("#68BBA5");
	var cTableCircle = d3.rgb("#6CA5CD");

	// Use these colors for the two strips
	var colors = [cBill,cRed];

	// Clip path for elements
  	var clipPath = svg.append("defs").append("clipPath")
  		.attr("id","clipPath")
  		.append("rect")
  		.attr("x",0)
  		.attr("y",0)
  		.attr("height",plot_tot_height)
  		.attr("width",chart_width-chart_margin.left-chart_margin.right);

	// render x-axis
	var x_axis = svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(" + chart_margin.left + "," + (chart_margin.top) + ")")
	    .call(xAxis);

	// level 1 groups
	var level_1 = svg.selectAll("level_1")
		.data(data)
		.enter()
		.append("g")
		.attr("class","level_1")
		.attr("id",function(d) {return d.key})
		.attr("border","1px solid black")
		.attr("transform",function(d,i) { return "translate(" + chart_margin.left + "," + (chart_margin.top) + ")" })
		.attr("clip-path","url(#clipPath)");

	// level 2 groups
	var years = level_1.selectAll("year")
		.data(function(d) {return d.values})
		.enter()
		.append("g")
		.attr("class","year")
		.attr("id",function(d) {return d.key})
		.attr("transform",function(d,i) { return "translate(" + year_margin.left + "," + (year_margin.top + i*year_height) + ")"});

	// level 3
	 level_3 = years.selectAll("level_3")
		.data(function(d) {return d.values})
		.enter()
		.append("circle")
		.attr("class","level_3")
		.attr("id",function(d) {return d.key + "_" + d.Year})
		.attr("cx",function(d){return x_scale(d.value)})
		.attr("cy",function(d,i) {return item_factor[item_list.indexOf(d.key)].value*year_space})
		.attr("r",function(d) {return AToR(a_scale(d.size))})
		.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
		.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
		.attr("fill-opacity",.7)
		.attr("active",1)
		.attr("d",function(d){return d.active=1;})
		; 

	updatePathData();

	// Draw the paths
	var paths = svg.selectAll("level_3_path")
		.data(path_data)
		.enter()
		.append("line")
		.attr("class","level_3_path")
		.attr("x1",function(d) {return d.plot_x1})
		.attr("x2",function(d) {return d.plot_x2})
		.attr("y1",function(d,i) {return d.plot_y1})
		.attr("y2",function(d,i) {return d.plot_y2})
		.attr("transform","translate(" + (chart_margin.left + year_margin.left) + "," + (chart_margin.top + year_margin.top) + ")")
		.attr("opacity",0)
		.attr("clip-path","url(#clipPath)")
		.attr("d",function(d) {return d.active = 0;});

	//***************************************************
	// Slider
	//***************************************************

	slider_svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + slider_height / 2 + ")")
	    .call(d3.svg.axis()
	      .scale(slider_x)
	      .orient("bottom")
	      .tickFormat(function(d) { return d + "%"; })
	      .ticks(0)
	      .tickSize(0)
	      .tickPadding(12))
	   
	  .select(".domain")
	  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
	    .attr("class", "halo");

	var slider = slider_svg.append("g")
	    .attr("class", "slider")
	    .call(brush);

	slider.selectAll(".extent,.resize")
	    .remove();

	slider.select(".background")
	    .attr("height", slider_height)
	    .attr("width",slider_width)
	    .attr("x",-9)
	    .style("cursor","default");

	var handle = slider.append("circle")
	    .attr("class", "handle")
	    .attr("transform", "translate(0," + slider_height / 2 + ")")
	    .attr("r", 9);

	var slider_text = slider_svg.append("text")
		.attr("id","slider_text")
		.attr("transform","translate(" + 0 + "," + (slider_height/2) + ")")
		.attr("text-anchor","right")
		.attr("dy",".3em")
		.attr("x",(slider_width-70))
		.attr("fill","rgb(54,54,54)")
		.text(slider_value + "%");

	slider_svg
    	.attr("opacity",.2);

	d3.select("#c1").on("change",checkboxClick);

	//***************************************************
	// Legend
	//***************************************************

	var legend_width = chart_width-chart_margin.left - chart_margin.right;
	var legend_key_1_width = legend_width/no_key_1;
	var legend_key_1_margin = {
		"top":0,
		"bottom":0,
		"left":0,
		"right":20
	}

	// Define legend bottom labels
	var legend_labels = svg.selectAll("legend_labels")
		.data(data)
		.enter()
		.append("text")
		.attr("text-anchor","middle")
		.attr("fill","rgb(200,200,200)")
		.text(function(d) {return d.key.toLowerCase()});

	var legend_label_height = legend_labels[0][0].clientHeight;

	legend_key_1_margin.bottom = legend_key_1_margin.bottom + legend_label_height;

	var legend_key_1_separation = 12.5;
	var legend_key_1_space_x = legend_key_1_width - legend_key_1_separation/2; 
	var legend_key_1_space_y = legend_height - legend_key_1_margin.top - legend_key_1_margin.bottom;
	var legend_key_1_year_height = legend_key_1_space_y/no_years;
	var legend_year_margin = {
		"top":6,
		"bottom":8,
		"left":2,
		"right":5
	};
	var legend_year_space = legend_key_1_year_height-legend_year_margin.top - legend_year_margin.bottom;
	var legend_year_space_x = legend_key_1_space_x - legend_year_margin.left - legend_year_margin.right;

	// move labels
	legend_labels
		.attr("transform",function(d,i) {return "translate(" + (chart_margin.left + (legend_key_1_width+legend_key_1_separation)*i + .5*legend_key_1_width) + "," + (chart_height - legend_key_1_margin.bottom + 10) + ")"});

  	// Legend scales
	// Bubble area scale
	var l_min_a = 1;
	var l_max_a = 50;
	var l_a_scale = d3.scale.linear()
		.domain([min_size,max_size])
		.range([l_min_a,l_max_a]);

	// X-scale
	var l_x_scale = d3.scale.linear()
		.domain([min_value,max_value])
		.range([0,legend_year_space_x]);

	var legends = svg.selectAll("legend")
		.data(data)
		.enter()
		.append("g")
		.attr("class","legend")
		.attr("id",function(d) {return "legend_" + d.key})
		.attr("transform",function(d,i) { return "translate(" + (chart_margin.left + (legend_key_1_width+legend_key_1_separation)*i) + "," + (chart_height-legend_height + legend_key_1_margin.top) + ")"});
		
	// year groups
	var legend_years = legends.selectAll("legend_year")
		.data(function(d) {return d.values})
		.enter()
		.append("g")
		.attr("class","legend_year")
		.attr("id",function(d) {return "legend_year_" + d.key})
		.attr("transform",function(d,i) { return "translate(" + legend_year_margin.left + "," + (legend_year_margin.top + i*legend_key_1_year_height) + ")"});

	var legend_key_3 = legend_years.selectAll("legend_level_3")
		.data(function(d) {return d.values})
		.enter()
		.append("circle")
		.attr("class","legend_level_3")
		.attr("id",function(d) {return "legend_level_3_" + d.key})
		.attr("cx",function(d,i){return l_x_scale(d.value) + i*legend_year_margin.left})
		.attr("cy",function(d,i) {return item_factor[item_list.indexOf(d.key)].value*legend_year_space})
		.attr("r",function(d) {return AToR(l_a_scale(d.size))})
		.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
		.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
		.attr("fill-opacity",.7)
		.attr("d",function(d){return d.legend_active=1;});

	var legend_path_data = deepCopy(path_data);
	var legend_path_data = d3.nest()
		.key(function(d) {return d.key_1})
		.entries(legend_path_data);
	
	// Legend path data
	addLegendPathData();

	var legend_path_group = svg.selectAll("legend")
		.data(legend_path_data)
		.enter()
		.append("g")
		.attr("class","legend_path_group")
		.attr("id",function(d) {return "legend_path_" + d.key})
		.attr("transform",function(d,i) { return "translate(" + (chart_margin.left + (legend_key_1_width+legend_key_1_separation)*i) + "," + (chart_height-legend_height + legend_key_1_margin.top) + ")"});

	var legend_paths = legend_path_group.selectAll("legend_path")
		.data(function(d) {return d.values})
		.enter()
		.append("line")
		.attr("class","legend_path")
		.attr("x1",function(d,i) {return d.legend_plot_x1 + i*legend_year_margin.left})
		.attr("x2",function(d,i) {return d.legend_plot_x2 + i*legend_year_margin.left})
		.attr("y1",function(d,i) {return d.legend_plot_y1})
		.attr("y2",function(d,i) {return d.legend_plot_y2})
		.attr("transform",function(d,i) { return "translate(" + legend_year_margin.left + "," + (legend_year_margin.top) + ")"})
		.attr("opacity",0)
		.attr("d",function(d) {return d.active = 0;});
		//.attr("clip-path","url(#clipPath)")
		;
	var legend_path_set = d3.selectAll(".legend_path")

	// Legend top lines
	var legend_lines = svg.selectAll("legend_line")
		.data(data)
		.enter()
		.append("line")
		.attr("class","legend_line")
		.attr("id",function(d) {return "legend_line_" + d.key})
		.attr("transform",function(d,i) {return "translate(" + (chart_margin.left + (legend_key_1_width+legend_key_1_separation)*i) + "," + (chart_height-legend_height + legend_key_1_margin.top) + ")"})
		.attr("x1",0)
		.attr("x2",legend_key_1_space_x)
		.attr("y1",0)
		.attr("y2",0)
		.attr("stroke","rgb(200,200,200)");

	// Legend Dim Label
	svg.append("text")
		.attr("class","legend_dim_label")
		.attr("transform","translate(0," + (chart_height-legend_height + legend_key_1_margin.top) + ")")
		.attr("dy","1em")
		.attr("text-anchor","end")
		.text(headers[0].toLowerCase() + "s")
		.attr("x",chart_margin.left-13);;

	// Legend hover rects
	var legend_rects = svg.selectAll("legend_rect")
		.data(data)
		.enter()
		.append("rect")
		.attr("class","legend_rect")
		.attr("id",function(d) {return "legend_rect_" + d.key})
		.attr("transform",function(d,i) {return "translate(" + (chart_margin.left + (legend_key_1_width+legend_key_1_separation)*i) + "," + (chart_height-legend_height + legend_key_1_margin.top) + ")"})
		.attr("x",0)
		.attr("y",0)
		.attr("width",legend_key_1_space_x)
		.attr("height",legend_height)
		.attr("fill-opacity",0)
		.attr("fill","white");

	//***************************************************
	// Table
	//***************************************************

	var table = container.append("div").attr("id","table_cont").append("table");
	 table_keys = [
						{
							"label":headers[2],
							"field":"key_3",
							"format":-1
						},
						{
						"label":headers[3] + " " + min_year,
						"field":"value_1",
						"format":"%"
						},
						{
						"label":headers[3] + " " + max_year,
						"field":"value_2",
						"format":"%"
						},
						{
						"label":headers[4] + " " + min_year,
						"field":"size_1",
						"format":","
						},
						{
						"label":headers[4] + " " + max_year,
						"field":"size_2",
						"format":","
						}
					];
	var table_head = table.append("thead");
	var table_header = table_head.append("tr");
	table_header.append("th")
		.style("width","15px")
		.style("border-bottom","none");
	var table_headers = table_header.selectAll("data_th")
		.data(table_keys)
		.enter()
		.append("th")
		.attr("class","data_th")
		.text(function(d) {return d.label})
		.style("text-align",function(d){if(d.label=="Office"){return "left"} else {return "right"}});
	var table_body = table.append("tbody");
	var table_rows = table_body.selectAll("tr")
		.data(path_data)
		.enter()
		.append("tr")
		.attr("d",function(d) {return d.table_active = 1;});
	 var table_circles = table_rows.append("td")
    	.attr("class","table_circle_cell")
    	.append("svg")
    	.attr("width","10px")
    	.attr("height","10px")
    	.append("circle")
    	.attr("r",2)
    	.attr("fill",cGrey.darker(.4))
    	.attr("cx",5)
    	.attr("cy",5)
    	.attr("stroke","none")
    	.attr("visibility","hidden");
	table_rows.selectAll("table_data")
    	.data(function(d) { return table_keys.map(function(k) { return {"value":d[k.field],"format":k.format} }); })
    	.enter().append("td")
    	.attr("class","table_data")
    	.style("text-align",function(d) {switch(typeof d.value) {case "number": return "right"; break; case "string": return "left"; break;}})
    	.text(function(d) {switch(d.format) {case "%": return percFormat(d.value); break; case ",": return commaFormat(d.value); break; default: return d.value;}});
   
   //***************************************************
	// D3 Events
	//***************************************************    

	legend_rects.on("mouseover",function(d,i) {

		var cur_reg = d.key;
		level_1.filter(function(e) {return e.key!=cur_reg}).selectAll(".level_3").filter(function(d) {return d.active==1;})
			.transition()
			.duration(300)
			.attr("fill","rgb(200,200,200)")
			.attr("fill-opacity",.2)
			.attr("stroke","rgb(200,200,200)")
			.attr("stroke-opacity",.3)
			.attr("d",function(d) {return d.active=0;});

		paths.filter(function(e) {return e.key_1!=cur_reg && e.active==1;})
			.transition()
			.duration(300)
			.attr("opacity",.2)
			.attr("d",function(d) {return d.active=0;});

		legend_path_set.filter(function(e) {return e.key_1!=cur_reg && e.active==1;})
			.transition()
			.duration(300)
			.attr("opacity",.2)
			.attr("d",function(d) {return d.active=0;});

		legend_labels.filter(function(e) {return e.key==cur_reg})
			.attr("fill","rgb(54,54,54)");

		table_rows.filter(function(e) {return e.key_1!=cur_reg && e.table_active==1})
			.transition()
			.duration(300)
    		.style("opacity",.2)
    		.attr("d",function(d) {return d.table_active=0;});

    	table_circles
    		.transition()
    		.delay(300)
    		.attr("visibility","");
		

	});

	legend_rects.on("mouseout", function() {
		repaintChart();
		legend_labels
			.attr("fill","rgb(200,200,200)");

		
	});


    level_3.on("mouseover", function(d,i) {
    	if (path_data.filter(function(e) {return e.key_3==d.key})[0].table_active==1) {
    		table_rows.filter(function(e) {return e.key_3!=d.key && e.table_active==1})
    		.style("opacity",.2);
    	}
    	
    })

    level_3.on("mouseout",function(d,i) {
    	table_rows.filter(function(e) {return e.table_active==1})
    		.style("opacity",1);
    })

    table_headers.on("click", function(k) {
	    table_rows.sort(function(a, b) { return (b[k.field]) - (a[k.field]); });
	 });

    //***************************************************
	// Viz Functions
	//***************************************************

	function repaintChart() {

		
		if(document.getElementById("c1").checked) {
			paths.filter(function(d) {return (d.value_2-d.value_1)>=(slider_value/100) && d.active ==0})
				.transition()
				.duration(300)
				.attr("opacity",1)
				.attr("d",function(d) {return d.active=1;});
			paths.filter(function(d) {return (d.value_2-d.value_1)<(slider_value/100) && d.active==1})
				.transition()
				.duration(300)
				.attr("opacity",0)
				.attr("d",function(d) {return d.active=0;});

			// legend paths
			legend_path_set.filter(function(d) {return (d.value_2-d.value_1)>=(slider_value/100) && d.active==0} )
				.transition()
				.duration(300)
				.attr("opacity",1)
				.attr("d",function(d) {return d.active=1;});
			legend_path_set.filter(function(d) {return (d.value_2-d.value_1)<(slider_value/100) && d.active==1})
				.transition()
				.duration(300)
				.attr("opacity",0)
				.attr("d",function(d) {return d.active=0;});
			

			// identify the list of nodes that are active
			var active_nodes = [];
			path_data.filter(function (d) {return (d.value_2-d.value_1)>=(slider_value/100)}).forEach(function(d) {
				active_nodes.push(d.key_3);
			});

			// grey out of place nodes
			level_3.filter(function(d) {return active_nodes.indexOf(d.key)==-1 && d.active==1})
				.transition()
				.duration(300)
				.attr("fill","rgb(200,200,200)")
				.attr("fill-opacity",.2)
				.attr("stroke","rgb(200,200,200)")
				.attr("stroke-opacity",.3)
				.attr("d",function(d){return d.active=0;});
			// paint in scope nodes
			level_3.filter(function(d) {return active_nodes.indexOf(d.key)>-1 && d.active!=1})
				.transition()
				.duration(300)
				.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
				.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
				.attr("fill-opacity",.7)
				.attr("stroke-opacity",1)
				.attr("d",function(d){return d.active=1;});

			// Legend nodes
			// grey out of place nodes
			legend_key_3.filter(function(d) {return active_nodes.indexOf(d.key)==-1 && d.legend_active==1})
				.transition()
				.duration(300)
				.attr("fill","rgb(200,200,200)")
				.attr("fill-opacity",.2)
				.attr("stroke","rgb(200,200,200)")
				.attr("stroke-opacity",.3)
				.attr("d",function(d){return d.legend_active=0;});
			// paint in scope nodes
			legend_key_3.filter(function(d) {return active_nodes.indexOf(d.key)>-1 && d.legend_active!=1})
				.transition()
				.duration(300)
				.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
				.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
				.attr("fill-opacity",.7)
				.attr("stroke-opacity",1)
				.attr("d",function(d){return d.legend_active=1;});

			// Table rows
			//inactive rows
			table_rows.filter(function(d) {return active_nodes.indexOf(d.key_3)==-1 && d.table_active==1})
				.transition()
				.duration(300)
    			.style("opacity",.2)
    			.attr("d",function(d){return d.table_active=0;});

    		//active rows
    		table_rows.filter(function(d) {return active_nodes.indexOf(d.key_3)>-1 && d.table_active!=1})
				.transition()
				.duration(300)
    			.style("opacity",1)
    			.attr("d",function(d){return d.table_active=1;});

    		slider_text
    			.text(percFormat(slider_value/100));
    		slider_svg
    			.attr("opacity",1);

    		table_circles.attr("visibility","");

		}
		
		else {
			paths
				.transition()
				.duration(300)
				.attr("opacity",0)
				.attr("d",function(d) {return d.active=0;});
			legend_path_set
				.transition()
				.duration(300)
				.attr("opacity",0)
				.attr("d",function(d) {return d.active=0;});
			level_3.filter(function(d) {return d.active!=1})
				.transition()
				.duration(300)
				.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
				.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
				.attr("fill-opacity",.7)
				.attr("stroke-opacity",1)
				.attr("d",function(d){return d.active=1});
			legend_key_3.filter(function(d) {return d.legend_active!=1})
				.transition()
				.duration(300)
				.attr("fill",function(d) {return colors[yr_scale(d.Year)]})
				.attr("stroke",function(d) {return colors[yr_scale(d.Year)]})
				.attr("fill-opacity",.7)
				.attr("stroke-opacity",1)
				.attr("d",function(d){return d.legend_active=1});

			table_rows.filter(function(d) {return d.table_active!=1})
				.transition()
				.duration(300)
				.style("opacity",1)
				.attr("d",function(d){return d.table_active=1;});
			slider_svg
    			.attr("opacity",.2);
	
			table_circles.transition().attr("visibility","hidden");
			
		}
	}

	function addLegendPathData() {
		legend_path_data.forEach(function(e) {
			e.values.forEach(function(d) {
			cx1 = l_x_scale(d.value_1);
			cx2 = l_x_scale(d.value_2);
			cy1 = d.factor*legend_year_space;
			cy2 = d.factor*legend_year_space+legend_key_1_year_height;
			r1 = AToR(l_a_scale(d.size_1));
			r2 = AToR(l_a_scale(d.size_2));

			tot_d = Math.sqrt(Math.pow(cx2-cx1,2)+Math.pow(cy2-cy1,2));
			//d1 = tot_d - r1;
			ratio1 = r1/tot_d;

			dx1 = ratio1*(cx2-cx1);
			dy1 = ratio1*(cy2-cy1);
			nx1 = cx1+dx1;
			ny1 = cy1 + dy1;
			d.legend_plot_x1 = nx1;
			d.legend_plot_y1 = ny1;
			//d.legend_plot_x2 = cx2;
			//d.legend_plot_y2 = cy2;

			ratio2 = r2/tot_d;
			dx2 = ratio2*(cx2-cx1);
			dy2 = ratio2*(cy2-cy1);
			nx2 = cx2-dx2;
			ny2 = cy2-dy2;
			d.legend_plot_x2=nx2;
			d.legend_plot_y2=ny2;

			
			})

		})
	
	};

	function brushed() {

		if(document.getElementById("c1").checked) {
		  var value = brush.extent()[0];

		  if (d3.event.sourceEvent) { 
		    value = slider_x.invert(d3.mouse(this)[0]);
		    brush.extent([value, value]);
		  }

		  slider_value = value;

		  handle.attr("cx", slider_x(value));

		  brushPaths(slider_value);
		}
	}

	function brushPaths(slider_value) {
		repaintChart();
	}

	function checkboxClick() {
		brushPaths(slider_value);
	}

	function updatePathData() {
		path_data.forEach(function(d) {
			cx1 = x_scale(d.value_1);
			cx2 = x_scale(d.value_2);
			cy1 = d.factor*year_space;
			cy2 = d.factor*year_space+year_height;
			r1 = AToR(a_scale(d.size_1));
			r2 = AToR(a_scale(d.size_2));

			tot_d = Math.sqrt(Math.pow(cx2-cx1,2)+Math.pow(cy2-cy1,2));
			//d1 = tot_d - r1;
			ratio1 = r1/tot_d;

			dx1 = ratio1*(cx2-cx1);
			dy1 = ratio1*(cy2-cy1);
			nx1 = cx1+dx1;
			ny1 = cy1 + dy1;
			d.plot_x1 = nx1;
			d.plot_y1 = ny1;
			d.plot_x2 = cx2;
			d.plot_y2 = cy2;

			ratio2 = r2/tot_d;
			dx2 = ratio2*(cx2-cx1);
			dy2 = ratio2*(cy2-cy1);
			nx2 = cx2-dx2;
			ny2 = cy2-dy2;
			d.plot_x2=nx2;
			d.plot_y2=ny2;

			
		})
	};

	function rToA (r) {
		return Math.pow(r,2)*Math.PI;
	}

	function AToR (a) {
		return Math.sqrt(a/Math.PI);
	}

	function zoomed() {
	  svg.select(".x.axis").call(xAxis);
	  level_3.attr("cx",function(d){return x_scale(d.value)})
	  updatePathData();
	  paths
	  	.attr("x1",function(d) {return d.plot_x1})
		.attr("x2",function(d) {return d.plot_x2})
		.attr("y1",function(d,i) {return d.plot_y1})
		.attr("y2",function(d,i) {return d.plot_y2});

	}

  }

  function deepCopy(obj) {
    if (Object.prototype.toString.call(obj) === '[object Array]') {
        var out = [], i = 0, len = obj.length;
        for ( ; i < len; i++ ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    if (typeof obj === 'object') {
        var out = {}, i;
        for ( i in obj ) {
            out[i] = arguments.callee(obj[i]);
        }
        return out;
    }
    return obj;
}
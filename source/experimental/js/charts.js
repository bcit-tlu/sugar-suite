// --- EXPERIMENTAL --- //
(function ($) {
	// "use strict";
	
	var tableTypes = [
	".bar-grouped",
	".pie"
];
	var tablesExist = $(tableTypes.join(",")).length;

	var colorCategories = [
	"primary",
	"secondary",
	"complement"
];
	var colorVariations = [
	"light",
	"lighter",
	"lightest",
	"dark",
	"darker",
	"darkest"
];

	var palette = {};
	var paletteArray = [];
	for (var cat of colorCategories) {
		var color = cat + "-color";

		palette[cat] = {};
		palette[cat].base = sampleColor(color);
		paletteArray.push(sampleColor(color));

		for (var vari of colorVariations) {
			palette[cat][vari] = sampleColor(color + "-" + vari);
			paletteArray.push(sampleColor(color + "-" + vari));
		}
	}

	function sampleColor(color) {
		var $color = $("<div>");
		var sample;
		$color.addClass(color);
		$("body").append($color);
		sample = $color.css("background-color");
		$color.remove();
		return sample;
	}


	if (tablesExist) {
		// Load Plotly from local file
		if (typeof Plotly === 'undefined') {
			const script = document.createElement('script');
			script.src = '/js/vendor/plotly-3.1.1.min.js';
			script.onload = function() {
				buildCharts();
			};
			script.onerror = function() {
				console.error('Failed to load Plotly from local file');
			};
			document.head.appendChild(script);
		} else {
			buildCharts();
		}
	}

	function buildCharts() {
		var d3ChartCount = 0;

		$(".bar-grouped").each(function () {
			var chartID = "d3Chart" + d3ChartCount++;
			var tableRows = htmlTableToArrays.call(this);
			if ($(this).hasClass("flip")) {
				tableRows = flipData(tableRows);
			}
			var staticPlot = false;
			if ($(this).hasClass("static")) {
				staticPlot = true;
			}
			var colHeaders = getColHeaders(tableRows);
			var rowHeaders = getRowHeaders(tableRows);
			var horizontalData = removeBothHeaders(tableRows);
			var verticalData = flipData(removeBothHeaders(tableRows));

			var data = [];
			colHeaders.shift();
			for (var i = 1; i < tableRows.length; i++) {
				data[i - 1] = {
					x: colHeaders,
					y: horizontalData[i - 1],
					name: rowHeaders[i],
					type: "bar",
					marker: {
						color: paletteArray[i * 7]
					}
				};
			}

			var layout = {
				paper_bgcolor: "rgb(255,255,255)",
				plot_bgcolor: "rgb(255,255,255)",
				barmode: 'bar',
				margin: {
					t: 0,
					l: 50,
					b: 100
				},
				xaxis: {
					tickangle: 0,
					tickfont: {
						size: 14,
						color: 'rgb(107, 107, 107)'
					}
				},
				legend: {
					x: 1.0,
					y: 1.0,
					bgcolor: 'rgba(255, 255, 255, 0)',
					bordercolor: 'rgba(255, 255, 255, 0)'
				}
			};

			$(this).after("<div id='" + chartID + "'></div>");
			Plotly.newPlot(chartID, data, layout, {
				staticPlot: staticPlot
			});

			$(this).hide();
			$(this).before("<button class='toggle'>Toggle Table Data</button>");
		});

		//	$(".pie-grouped").each(function () {
		//		var chartID = "d3Chart" + d3ChartCount++;
		//		var tableRows = htmlTableToArrays.call(this);
		//		if ($(this).hasClass("flip")) {
		//			tableRows = flipData(tableRows);
		//		}
		//		var staticPlot = false;
		//		if ($(this).hasClass("static")) {
		//			staticPlot = true;
		//		};
		//		var colHeaders = getColHeaders(tableRows);
		//		var rowHeaders = getRowHeaders(tableRows);
		//		var horizontalData = removeBothHeaders(tableRows);
		//
		//		console.log("colHeaders: ", colHeaders.length);
		//		console.log("rowHeaders: ", rowHeaders.length);
		//		console.log("horizontalData: ", horizontalData.length);
		//
		//		var data = [];
		//		var layout = {
		//			annotations: []
		//		};
		//		var domainWidth = 1 / (horizontalData.length);
		//		console.log(domainWidth);
		//		colHeaders.shift();
		//		for (var i = 1; i < tableRows.length; i++) {
		//			data[i - 1] = {
		//				labels: colHeaders,
		//				values: horizontalData[i - 1],
		//				name: rowHeaders[i],
		//				type: "pie",
		//				direction: "clockwise",
		//				rotation: 0,
		//				sort: true,
		//				marker: {
		//					line: {
		//						width: 3
		//					}
		//				},
		//				hole: 0.333,
		//				domain: {
		//					x: [(i - 1) * domainWidth, i * domainWidth],
		//					y: [0, 1]
		//				}
		//			};
		//			console.log((((i - 1) * domainWidth) + (i * domainWidth)) / 2);
		//			layout.annotations.push({
		//				showarrow: false,
		//				text: rowHeaders[i],
		//				x: (i - 1) * domainWidth,
		//				y: 0,
		//				center: true
		//			})
		//		};
		//
		//		//	var layout = {
		//		//		annotations: [
		//		//			{
		//		//				text: "ANNOTATION",
		//		//				showarrow: false,
		//		//				x: 0,
		//		//				y: 0
		//		//			},
		//		//			{
		//		//				text: "ANNOTATION",
		//		//				showarrow: false,
		//		//				x: 0,
		//		//				y: 1
		//		//			}
		//		//		]
		//		//	};
		//		console.log(layout);
		//
		//		$(this).after("<div id='" + chartID + "'></div>");
		//		Plotly.newPlot(chartID, data, layout, {
		//			staticPlot: staticPlot
		//		});
		//
		//		//$(this).hide();
		//		$(this).before("<button class='toggle'>Toggle Table Data</button>");
		//	});




		$(".pie").each(function () {
			var chartID = "d3Chart" + d3ChartCount++;
			var tableRows = htmlTableToArrays.call(this);
			if ($(this).hasClass("flip")) {
				tableRows = flipData(tableRows);
			}
			var staticPlot = false;
			if ($(this).hasClass("static")) {
				staticPlot = true;
			}

			tableRows[1] = tableRows[1].map(function (value) {
				return parseFloat(value);
			});
			var data = [{
				labels: tableRows[0],
				values: tableRows[1],
				hole: 0.4,
				type: "pie"
	}];
			var layout = {};

			$(this).after("<div id='" + chartID + "'></div>");
			Plotly.newPlot(chartID, data, layout, {
				staticPlot: staticPlot
			});
			$(this).hide();
			$(this).before("<button class='toggle'>Toggle Table Data</button>");

		});

		$("button.toggle").on("click", function () {
			$(this).next().fadeToggle();
		});

		function getColHeaders(tableRows) {
			return tableRows[0];
		}

		function getRowHeaders(tableRows) {
			return tableRows.map(function (row) {
				return row[0];
			});
		}

		function flipData(data) {
			var newData = [];
			for (var i = 0; i < data.length; i++) {
				for (var j = 0; j < data[i].length; j++) {
					if (typeof newData[j] == "undefined") {
						newData[j] = [];
					}
					newData[j][i] = data[i][j];
				}
			}
			return newData;
		}

		function removeBothHeaders(tableRows) {
			var rows = tableRows;
			rows = removeRowHeaders(rows);
			rows = removeColHeaders(rows);
			return rows;
		}

		function removeRowHeaders(tableRows) {
			var rows = tableRows.slice();
			rows.shift();
			return rows;
		}

		function removeColHeaders(tableRows) {
			var rows = tableRows.map(function (row) {
				var newRow = row.slice();
				newRow.shift();
				return newRow;
			});
			return rows;
		}

		function htmlTableToArrays() {
			var tableRows = [];
			$(this).find("tr").each(function () {
				var thisRow = [];
				$(this).find("th, td").each(function () {
					thisRow.push($(this).text().trim());
				});
				tableRows.push(thisRow);
			});
			return tableRows;
		}
	}
}(jQuery));
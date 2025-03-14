const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3.select("#vis")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("display", "none");

d3.csv("./data/weather.csv").then(function(data) {
    
    data.forEach(d => {
        d.date = new Date(
            +d.date.substring(0, 4), // Year
            +d.date.substring(4, 6) - 1, // Month
            +d.date.substring(6, 8) // Day
        );
        d.TMAX = +d.TMAX;
        d.TMIN = +d.TMIN;

        let month = d.date.getMonth() + 1;
        d.SEASON = (month <= 2 || month === 12) ? "Winter" :
                   (month >= 3 && month <= 5) ? "Spring" :
                   (month >= 6 && month <= 8) ? "Summer" : "Fall";
    });

    allData = data;

    createViolinPlot(allData);
});

function createViolinPlot(data) {
    const groupedData = d3.group(data, d => d.SEASON);
    const seasonArray = Array.from(groupedData, ([key, values]) => ({ key, values }));

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.TMIN), d3.max(data, d => d.TMAX)])
        .range([height, 0]);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(["Winter", "Spring", "Summer", "Fall"])
        .padding(0.05);

    if (svg.select("g.y-axis").empty()) {
        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));
    } else {
        svg.select("g.y-axis")
            .transition()
            .duration(750)
            .call(d3.axisLeft(y));
    }

    if (svg.select("g.x-axis").empty()) {
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));
    } else {
        svg.select("g.x-axis")
            .transition()
            .duration(750)
            .call(d3.axisBottom(x));
    }

    const histogram = d3.histogram()
        .domain(y.domain())
        .thresholds(y.ticks(20)) // Number of bins
        .value(d => d);

    const sumstat = seasonArray.map(season => ({
        season: season.key,
        binsTMAX: histogram(season.values.map(d => d.TMAX)),
        binsTMIN: histogram(season.values.map(d => d.TMIN))
    }));

    const maxNum = d3.max(sumstat, s => d3.max(s.binsTMAX.concat(s.binsTMIN), d => d.length));

    const xNum = d3.scaleLinear()
        .range([0, x.bandwidth()])
        .domain([-maxNum, maxNum]);

    function createAreaGenerator() {
        return d3.area()
            .x0(d => xNum(-d.length))
            .x1(d => xNum(d.length))
            .y(d => y(d.x0))
            .curve(d3.curveCatmullRom);
    }

    const maxTempGroups = svg.selectAll(".violinTMAX")
        .data(sumstat, d => d.season);

    maxTempGroups.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    const maxTempEnter = maxTempGroups.enter()
        .append("g")
        .attr("class", "violinTMAX")
        .attr("transform", d => `translate(${x(d.season)}, 0)`);

    maxTempEnter.append("path")
        .style("fill", "red")
        .style("opacity", 0)
        .attr("d", d => createAreaGenerator()(d.binsTMAX))
        .on("mouseover", function(event, d) {
            const seasonName = d3.select(this.parentNode).datum().season;
            const seasonData = allData.filter(entry => entry.SEASON === seasonName);

            const medianTMAX = d3.median(seasonData, entry => entry.TMAX)?.toFixed(2) || "N/A";

            d3.select("#tooltip")
                .style("display", "block")
                .html(`<strong>Maximum Temperature Median</strong>: ${medianTMAX}°F`) 
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.select(this).style("stroke", "black").style("stroke-width", "2px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("display", "none");
            d3.select(this).style("stroke-width", "0px");
        })
        .transition()
        .duration(750)
        .style("opacity", 0.6);

    maxTempGroups.select("path")
        .transition()
        .duration(750)
        .attr("d", d => createAreaGenerator()(d.binsTMAX));

    const minTempGroups = svg.selectAll(".violinTMIN")
        .data(sumstat, d => d.season);

    minTempGroups.exit()
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();

    const minTempEnter = minTempGroups.enter()
        .append("g")
        .attr("class", "violinTMIN")
        .attr("transform", d => `translate(${x(d.season)}, 0)`);

    minTempEnter.append("path")
        .style("fill", "blue")
        .style("opacity", 0)
        .attr("d", d => createAreaGenerator()(d.binsTMIN))
        .on("mouseover", function(event, d) {
            const seasonName = d3.select(this.parentNode).datum().season;
            const seasonData = allData.filter(entry => entry.SEASON === seasonName);

            const medianTMIN = d3.median(seasonData, entry => entry.TMIN)?.toFixed(2) || "N/A";

            d3.select("#tooltip")
                .style("display", "block")
                .html(`<strong>Minimum Temperature Median</strong>: ${medianTMIN}°F`)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.select(this).style("stroke", "black").style("stroke-width", "2px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("display", "none");
            d3.select(this).style("stroke-width", "0px");
        })
        .transition()
        .duration(750)
        .style("opacity", 0.6);

    minTempGroups.select("path")
        .transition()
        .duration(750)
        .attr("d", d => createAreaGenerator()(d.binsTMIN));
}

function updateVis() {
    let selectedSeason = document.getElementById('season-select').value;
    let filteredData = selectedSeason === "all" ? allData : allData.filter(d => d.SEASON === selectedSeason);

    createViolinPlot(filteredData); 
}

document.getElementById('season-select').addEventListener('change', updateVis);


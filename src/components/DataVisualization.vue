<template lang="pug">
  v-container
    v-card(class="d-flex justify-center mb-8")
      v-card(class="pa-2")
        v-sheet(color="grey lighten-4" :height="canvas_height" :width="canvas_width")
          div(id="painting")
            svg(id="viz" :height="canvas_height" :width="canvas_width" class="container-border")
      v-card(class="pa-2" color="yellow darken-3" dark)  
        v-sheet(width="300" color="yellow darken-3")
          v-toolbar(color="yellow darken-3")
            v-toolbar-title CONFIG
          v-spacer(class="mt-6")
          v-row
            v-combobox(v-model="combobox_topology" :items="combobox_topology_list" outlined dense @change="changeTopology")
          template(v-if="combobox_topology === 'physics'")
            v-row
              v-combobox(v-model="combobox_layer" :items="combobox_layer_list" outlined dense @change="changeLayer")
            v-row
              //- v-btn(@click="displayHeatMap") HEATMAP
              template(v-if="run_flag === false")
                v-btn(@click="start") START
              template(v-else)
                v-btn(@click="start") STOP

          template(v-else-if="combobox_topology === 'logic'")
            v-row
              v-text-field(v-model="filter_nodes" label="Filter by node name" placeholder="Filter by node name" outlined dense)
            v-row
              v-text-field(v-model="filter_rels" label="Filter by relationship name" placeholder="Filter by relationship name" outlined dense)
            v-row
              v-text-field(v-model="n_clusters" label="clusters num" placeholder="clusters num" outlined dense)
            v-row
              v-btn(@click="logicFilterApply") APPLY
      v-dialog(v-model="dialog_relationship" width="1000")
        v-card
          v-card-title(class="text-h5 grey lighten-2") Connection relationship
          v-card-text(v-html="text_relationship")
</template>

<script>
import * as d3 from 'd3'
import axios from 'axios'
import * as echarts from 'echarts'

export default {
  data () {
    return {
      dialog_relationship: false,
      text_relationship: '',
      filter_nodes: 'mongoose,radon,eagleowl,transceiver afe8092',
      filter_rels: 'sxp,eth,cpri,spi,trx',
      n_clusters: 4,
      combobox_topology: 'physics',
      combobox_topology_list: ['logic', 'physics'],
      combobox_layer: 'TOP',
      combobox_layer_list: ['TOP', 'BOTTOM'],
      heatmap_flag: false,
      run_flag: false,
      physical_board: {
        x: -20,
        y: -10,
        width: 415,
        height: 660
      },
      heatmap_compensate: {
        x_compensate: -55,
        y_compensate: -60,
        width_compensate: 110,
        height_compensate: 130,
      },

      nodes_temperature_data: [],

      data: [],
      nodes: [],
      node: '',
      links: [],
      link: '',
      types: [],
      defs: '',
      color: '',
      svg:'',
      simulation: '',
      zoom: '',
      gx:[],
      gy:[],
      x:[],
      y:[],
      margin: {
        top: 20,
        right: 40,
        bottom: 30,
        left: 40
      },
      scale_min: 0.1,
      scale_max: 5,
      canvas_width: 800,
      canvas_height: 600,
      index_source: 0,
      index_target: 0,
      index_pos:0,
      transform: 'translate(0,0) scale(1)',
      interval: '',
      interval2: '',
      interval3: '',
      refresh_interval: 1000,
      history_data_pool: [],
    }
  },

  mounted () {
    this.canvas_width = document.body.offsetWidth -450,
    this.canvas_height = document.body.offsetHeight - 80,
    this.getPhysicalChartData()
  },
  methods: {
    changeTopology () {
      if (this.combobox_topology == 'physics') {
        this.getPhysicalChartData()
      }else{
        this.clearDataDisplay()
        this.logicFilterApply()
      }
    },
    changeLayer () {
      this.getPhysicalChartData()
      this.clearDataDisplay()
      this.heatmap_flag = false
    },
    async getPhysicalChartData () {
      await this.$http.get(this.$urls.data_visualization_get, {
        params: {
            operate: 'get_physics_chart_data',
            layer_ref: this.combobox_layer,
        },
        })
        .then(response => {
          this.data = response.data.content
          this.clear()
          this.createPhysicalChart()
          this.createPhysicalInteractiveEvent()
          this.createDynamicUpdate()
          // this.logs()
        })
    },
    createPhysicalChart () {
      this.nodes = this.data.nodes.map(d => Object.create(d));

      this.simulation = d3.forceSimulation(this.nodes)
          .force("charge", d3.forceManyBody().strength(-2000))
          .force("x", d3.forceX())
          .force("y", d3.forceY());

      this.svg = d3.select("#viz").style("font", "6px sans-serif").append("g").attr("id", "new")
      this.resetCoordinates()

      this.svg.append("rect")
        .attr('fill', '#228B22')
        .attr("x", this.physical_board.x)
        .attr("y", this.physical_board.y)
        .attr('width', this.physical_board.width)
        .attr('height', this.physical_board.height)
        .style('stroke', "#C0C0C0")
        .style('stroke-width', 1)


      this.node = this.svg.append("g")
          .attr("id", "nodes")
          .attr("fill", "currentColor")
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(this.nodes)
        .join("g")
          .attr("id",  d => `${d.id}`)
          .attr("desc",  d => `${d.desc}`)

      this.node.append("rect")
        .attr('fill', '#FFD700')
        .attr('width',d => `${d.width}`)
        .attr('height',d => `${d.height}`)
        .style('stroke', "#C0C0C0")
        .style('stroke-width', 1)

      // this.node.append("text")
      //     .attr("x", 2)
      //     .attr("y", -2)
      //     .text(d => d.id)
      //     .style('fill', "#FFFFF0")
      //   .clone(true).lower()
      //     .attr("fill", "none")
      //     .attr("stroke", "white")
      //     .attr("stroke-width", 0.2);

      this.simulation.on("tick", () => {
        this.node.attr("transform", d => `translate(${d.location_x},${d.location_y})`);
      });
    },
    createPhysicalInteractiveEvent(){
      d3.select("#nodes").selectAll("g").each(function(d, i) {
        d3.select(this).attr("pointer-events", "all")
          .on("mouseenter", (event, d) => {
            let text = d3.select(this).attr("desc")
            d3.select(this).append('rect').attr("class", "tip").attr('x',0).attr('y',-25).attr('width', text.length * 4).attr('height', 20).attr('fill', "#000000DD")
            d3.select(this).append('text').attr("class", "tip").attr('x',0).attr('y',-18).style('fill', "#FFFFFF").text(d3.select(this).attr("id"))
            d3.select(this).append('text').attr("class", "tip").attr('x',0).attr('y',-9).style('fill', "#FFFFFF").text(text)
          })
          .on("mouseleave", (event, d) => {
            d3.select(this).selectAll('.tip').remove()
          })
      })   
    },
    async getLogicChartData () {
      await this.$http.get(this.$urls.data_visualization_get, {
        params: {
            operate: 'get_logic_chart_data',
        },
        })
        .then(response => {
          this.data = response.data.content
          // console.log(this.data)
          this.clear()
          this.createLogicChart()
          this.createLogicInteractiveEvent()
          this.createDynamicUpdate()
          // this.logs()
        })
    },
    createLogicChart () {
      let that = this
      this.links = this.data.links.map(d => Object.create(d));
      this.nodes = this.data.nodes.map(d => Object.create(d));
      this.types = this.data.types
      this.color = d3.scaleOrdinal(this.types, d3.schemeCategory10)

      this.simulation = d3.forceSimulation(this.nodes)
          .force("link", d3.forceLink(this.links).id(d => d.id))
          .force("charge", d3.forceManyBody().strength(-2000))
          .force("x", d3.forceX())
          .force("y", d3.forceY());
      this.svg = d3.select("#viz").style("font", "12px sans-serif").append("g").attr("id", "new")
      this.resetCoordinates()

      // Per-type markers, as they don't inherit styles.
      this.defs = this.svg.append("defs").selectAll("path")
        .data(this.links)
        .join("path")
          .attr("id", d => d.type)
          .attr("d", linkArc)
          .attr("fill", "none")
          .attr("stroke", d => this.color(d.type))
          .attr("stroke-width", 3)
          .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`)

      this.svg.select("defs").selectAll("marker")
        .data(this.types)
        .join("marker")
          .attr("id", d => `arrow-${d}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 15)
          .attr("refY", -0.5)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
        .append("path")
          .attr("fill", this.color)
          .attr("d", "M0,-5L10,0L0,5");

      this.svg.selectAll("use")
        .data(this.links)
        .join("use")
          .attr("xlink:xlink:href", d => `#${d.type}`)

      // this.link = this.svg.append("g")
      //     .attr("fill", "none")
      //   .selectAll("text")
      //   .data(this.links)
      //   .enter().append("text")
      //     .attr("font-family", "Verdana")
      //     .attr("font-size", "12")
      //     .style('fill', "#008000")
      //   .append("textPath")
      //     .attr("xlink:xlink:href", d => `#${d.type}`)
      //     .attr("startOffset", "50%")
      //     .text(d => d.type)

      this.node = this.svg.append("g")
          .attr("id", "nodes")
          .attr("fill", "currentColor")
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(this.nodes)
        .join("g")
          .attr("id",  d => `${d.id}`)

      this.node.append("rect")
          .attr('fill', '#32CD32')
          .attr('width',d => `${d.width}`)
          .attr('height',d => `${d.height}`)
          .style('stroke', "#C0C0C0")
          .style('stroke-width', 2)

      this.node.append("text")
          .attr("x", 5)
          .attr("y", 15)
          .text(d => d.id)
          .style('fill', "#FFFFF0")
        .clone(true).lower()
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 3);

      this.node.append("text")
          .attr("x", 5)
          .attr("y", 30)
          .text(d => d.desc)
          .style('fill', "#FFFFF0")
        .clone(true).lower()
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", 3);

      this.simulation.on("tick", () => {
        this.node.attr("transform", d => `translate(${d.location_x},${d.location_y})`);
        this.defs.attr("d", linkArc);
      });

      function linkArc(d) {
        if ((d.source.index == that.index_source) && (d.target.index == that.index_target)){
          that.index_pos = that.index_pos + 1 
        }else{
          that.index_source = d.source.index
          that.index_target = d.target.index
          that.index_pos = 0
        }
        return `
          M ${d.source.location_x},${d.source.location_y + that.index_pos * 20} 
          L ${d.target.location_x},${d.target.location_y + that.index_pos * 20}
        `;
      }
    },
    async logicFilterApply () {
      await this.$http.get(this.$urls.data_visualization_get, {
        params: {
            operate: 'get_logic_chart_data_filter_by_nodes',
            filter_nodes: this.filter_nodes,
            filter_rels: this.filter_rels,
            n_clusters: this.n_clusters,
        },
        })
        .then(response => {
          this.data = response.data.content
          this.clear()
          this.createLogicChart()
          this.createLogicInteractiveEvent()
          this.createDynamicUpdate()
          // this.logs()
        })
    },
    createLogicInteractiveEvent(){
      let that = this
      let tmp = 0
      d3.select("#nodes").selectAll("g").each(function(d, i) {
        d3.select(this).attr("pointer-events", "all")
          .on("mouseenter", (event, d) => {
            if (tmp == 0){
              that.syncTestData(d3.select(this))
              tmp = 1
            }else{
              d3.select(this).append("foreignObject")
                .attr("class", "tip")
                .attr('x',0)
                .attr('y',-202)
                .attr("width", 300)
                .attr("height", 200)
                .html('<div id="test_chart" class="children" dom_type="chart" style="background:white;width: 300px;height:200px;" >')
              that.syncEchartTestData(d3.select(this))
              tmp = 0
            }
          })
          .on("mouseleave", (event, d) => {
            if (that.interval == ''){
            }else{
              clearInterval(that.interval)
              that.interval = ''
            }
            d3.select(this).selectAll('.tip').remove()
          })
      })
      d3.select("defs").selectAll("path").each(function(d, i) {
        d3.select(this).on("click", function() {
            that.text_relationship = d3.select(this).attr('id').replace(/\s+/g, "<br/>")
            that.dialog_relationship = true
          })
      })      
    },
    createDynamicUpdate(){
      let that = this
      let flag = true
      if (this.interval2 == ''){
        this.interval2 = setInterval(function() {        
          if(flag == true){
            // d3.select("#Ethernet0").attr("stroke", "#DC143C")
            d3.select("#D10E0MIB").select("rect").attr("fill", "#DC143C")
            flag = false
          }else{
            // d3.select("#Ethernet0").attr("stroke", "#32CD32")
            d3.select("#D10E0MIB").select("rect").attr("fill", "#32CD32")
            flag = true
          }
        },this.refresh_interval)
      }
    },
    syncTestData(elm){
      let that = this
      if (this.interval == ''){
        this.interval = setInterval(function() {
          that.$http.get(that.$urls.data_visualization_get, {
            params: {
                operate: 'get_echart_test_data',
            },
            })
            .then(response => {
              elm.append('rect').attr("class", "tip").attr('x',0).attr('y',-100).attr('width', 100).attr('height', 98).attr('fill', "#000000DD")
              elm.append('text').attr("class", "tip").attr('x',0).attr('y',-25).style('fill', "#FFFFFF").text("radon rxpwr : " + response.data.content['radon rxpwr'])
              elm.append('text').attr("class", "tip").attr('x',0).attr('y',-50).style('fill', "#FFFFFF").text("radon ipwr : " + response.data.content['radon ipwr'])
              elm.append('text').attr("class", "tip").attr('x',0).attr('y',-75).style('fill', "#FFFFFF").text("radon wpwr : " + response.data.content['radon wpwr'])
            })
        },this.refresh_interval)
      }
    },
    syncEchartTestData(elm){
      let that = this
      if (this.interval == ''){
        this.interval = setInterval(function() {
          that.$http.get(that.$urls.data_visualization_get, {
            params: {
                operate: 'get_echart_test_data',
            },
            })
            .then(response => {
              let series = []
              let names = []
              let tmp = []
              Object.keys(response.data.content).forEach((key) => {
                if (Object.keys(that.history_data_pool).indexOf(key) == -1) {
                  that.history_data_pool[key] = []
                }
                that.history_data_pool[key].push(response.data.content[key])
                tmp = that.$common.sliceYAxisQueueHandle(that.history_data_pool[key], 30)
                series.push({'name':key, 'type':'line', 'showSymbol':false, 'data':tmp})
              })
              Object.keys(that.history_data_pool).forEach((key) => {
                names.push(key)
              })
              let ins = echarts.getInstanceByDom(elm.select('div').node())
              if (ins == null){
                echarts.init(elm.select('div').node()).setOption(that.$common.getChartConfig(names, series, that.$common.sliceXAxisQueueHandle(that.refresh_interval, 30)))
              }else{
                ins.setOption(that.$common.getChartConfig(names, series, that.$common.sliceXAxisQueueHandle(that.refresh_interval, 30)), true)
              }
            })
          },this.refresh_interval)
      }
    },
    resetCoordinates(){
      if(d3.select("#axis").empty()){
        d3.select("#viz").append("g").attr("id", "axis")
      }else{
        d3.select("#axis").selectAll('g').remove()
      }
      if (this.combobox_topology === 'physics')
      {
        d3.select("#axis").append("g").style("font", "20px times")
        .append("text")
          .attr("id", "axis_xy")
          .attr("x", 50)
          .attr("y", 50)
          .text("X:0 Y:0")
          .style("font", "14px")
          .style('fill', "#000000")

        d3.select("#new").attr("pointer-events", "all")
        .on('mousemove', (event, d) => {
          d3.select("#axis").select("#axis_xy").text(`X:${Math.round((event.layerX - this.transform.x) / this.transform.k)} Y:${Math.round((event.layerY - this.transform.y) / this.transform.k)}`)
        });

        this.transformXAxis(1)
        this.transformYAxis(1)
        this.gx = d3.select("#axis").append("g").call(this.xAxis, this.x, {'x':0, 'y':0, 'k':1})
        this.gy = d3.select("#axis").append("g").call(this.yAxis, this.y, {'x':0, 'y':0, 'k':1})
      }
      this.zoom = d3.zoom().scaleExtent([this.scale_min, this.scale_max]).on("zoom", this.zoomed)
      d3.select("#viz").call(this.zoom).on("dblclick.zoom", null)
    },
    transformXAxis (k) {
      this.x = d3.scaleLinear()
        .domain([0, this.canvas_width])
        .range([0, this.canvas_width ])
    },
    transformYAxis (k) {
      this.y = d3.scaleLinear()
        .domain([0, this.canvas_height])
        .range([0, this.canvas_height])
    },
    zoomed(event) {
      const {transform} = event
      this.transform = transform
      d3.select("#new").attr("transform", transform)
      if (this.combobox_topology === 'physics')
      {
        d3.select("#axis").attr("transform", transform)
        d3.select("#axis_xy").attr("transform", `translate(${-transform.x / transform.k },${(-transform.y+this.margin.top) / transform.k}) scale(${1 / transform.k})`)

        this.transformXAxis(transform.k)
        this.transformYAxis(transform.k)
        this.gx.call(this.xAxis, this.x, transform)
        this.gy.call(this.yAxis, this.y, transform)
      }
    },
    xAxis(g, x, transform){
      // g.attr("transform", `translate(${-transform.x / transform.k },${(-transform.y+this.margin.top) / transform.k}) scale(${1 / transform.k})`)
      g.attr("transform", `translate(0,${-10})`)
      .call(d3.axisTop(x).ticks(12 * transform.k))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke-opacity", 0.1)
        .attr("y1", this.canvas_height)
        .attr("y2", -transform.y))
    },
    yAxis(g, y, transform){
      // g.attr("transform", `translate(${(-transform.x + this.margin.left) / transform.k},${-transform.y / transform.k}) scale(${1 / transform.k})`)
      g.attr("transform", `translate(${-20},0)`)
      .call(d3.axisLeft(y).ticks(10 * transform.k))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line")
        .attr("stroke-opacity", 0.1)
        .attr("x1", this.canvas_width)
        .attr("x2", -transform.x))
    },
    /*****************************run******************************/
    start(){
      let that = this
      if (this.run_flag == false){
        this.interval3 = setInterval(function() {        
          that.$http.get(that.$urls.data_visualization_get, {
            params: {
              operate: 'get_board_temperature',
              layer_ref: that.combobox_layer,
            },
            })
            .then(response => {
              that.nodes_temperature_data = response.data.content
              that.createOrSyncDataDisplay()
            })
        },this.refresh_interval + 2000)
        this.run_flag = true
      }else{
        this.clearDataDisplay()
        clearInterval(this.interval3)
        this.run_flag = false
      }
    },
    createOrSyncDataDisplay(){
      if ((this.svg.select("#nodes_temperature_data").empty()) && (this.combobox_topology == 'physics')){
        this.svg.append("g")
            .attr("id", "nodes_temperature_node")
          .selectAll("circle")
          .data(this.nodes_temperature_data)
          .join("circle")
            .attr("cx", d => d.Location.x)
            .attr("cy", d => d.Location.y)
            .attr("r", 2)
            .attr("fill", "#FF69B4")
        this.svg.append("g")
            .attr("id", "nodes_temperature_data")
          .selectAll("text")
          .data(this.nodes_temperature_data)
          .join("text")
            .attr("id", d => d.Comonent_RefDes + '_data')
            .attr("x", d => d.Location.x + 2)
            .attr("y", d => d.Location.y - 3)
            .text(d => d.temperature)
            .style('fill', "#FF69B4")
          .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 0.2)
      }else{
        this.nodes_temperature_data.forEach((item) => {
          d3.select('#'+item.Comonent_RefDes+'_data').text(item.temperature)
        })
      }
    },
    /*****************************heatmap******************************/
    displayHeatMap(){
      if (this.heatmap_flag == false){
        this.createHeatMap()
      }else{
        clearInterval(this.interval3)
        this.interval3 = ''
        d3.select('#heatmap').remove()
        this.heatmap_flag = false
      }
    },
    createHeatMap(){
      var noise = this.getNoiseHelper();
      var xData = [];
      var yData = [];
      noise.seed(Math.random());

      function generateData(theta, min, max) {
        var data = [];
        for (var i = 0; i <= 200; i++) {
          for (var j = 0; j <= 100; j++) {
            // var x = (max - min) * i / 200 + min;
            // var y = (max - min) * j / 100 + min;
            data.push([i, j, noise.perlin2(i / 40, j / 20) + 0.5]);
            // data.push([i, j, normalDist(theta, x) * normalDist(theta, y)]);
          }
          xData.push(i);
        }
        for (var j = 0; j < 100; j++) {
          yData.push(j);
        }
        return data;
      }

      d3.select('#new').append("foreignObject")
          .attr("id", "heatmap")
          .attr('x', this.physical_board.x + this.heatmap_compensate.x_compensate)
          .attr('y',this.physical_board.y + this.heatmap_compensate.y_compensate)
          .attr("width", this.physical_board.width + this.heatmap_compensate.width_compensate)
          .attr("height", this.physical_board.height+ this.heatmap_compensate.height_compensate)
          .html('<div style="width: '+(this.physical_board.width + this.heatmap_compensate.width_compensate).toString()+'px;height:'+(this.physical_board.height+ this.heatmap_compensate.height_compensate).toString()+'px;" >')
      this.heatmap_flag = true

      var data = generateData(2, -5, 5)
      var option = {
        tooltip: {},
        xAxis: {
          type: 'category',
          data: xData,
          axisLabel:{
            show:false
          },
          axisTick:{
            show:false
          },
          axisLine:{
            show:false
          },
        },
        yAxis: {
          type: 'category',
          data: yData,
          axisLabel:{
            show:false
          },
          axisTick:{
            show:false
          },
          axisLine:{
            show:false
          },
        },

        visualMap: {
          min: 0,
          max: 1,
          calculable: true,
          realtime: false,
          show: false,
          inRange: {
            color: [
              '#313695aa',
              '#4575b4aa',
              '#74add1aa',
              '#abd9e9aa',
              '#e0f3f8aa',
              '#ffffbfaa',
              '#fee090aa',
              '#fdae61aa',
              '#f46d43aa',
              '#d73027aa',
              '#a50026aa'
            ]
          }
        },
        series: [
          {
            name: 'Gaussian',
            type: 'heatmap',
            data: data,
            emphasis: {
              itemStyle: {
                borderColor: '#333',
                borderWidth: 1,
              }
            },
            progressive: 1000,
            animation: false
          }
        ]
      }
  
      let ins = echarts.getInstanceByDom(d3.select('#heatmap').select('div').node())
      if (ins == null){
        echarts.init(d3.select('#heatmap').select('div').node()).setOption(option)
      }else{
        ins.setOption(option)
      }
    },
    getNoiseHelper(global) {
      var module = {};
      function Grad(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      Grad.prototype.dot2 = function (x, y) {
        return this.x * x + this.y * y;
      };
      Grad.prototype.dot3 = function (x, y, z) {
        return this.x * x + this.y * y + this.z * z;
      };
      var grad3 = [
        new Grad(1, 1, 0),
        new Grad(-1, 1, 0),
        new Grad(1, -1, 0),
        new Grad(-1, -1, 0),
        new Grad(1, 0, 1),
        new Grad(-1, 0, 1),
        new Grad(1, 0, -1),
        new Grad(-1, 0, -1),
        new Grad(0, 1, 1),
        new Grad(0, -1, 1),
        new Grad(0, 1, -1),
        new Grad(0, -1, -1)
      ];
      var p = [
        151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
        36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
        234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
        88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
        134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
        230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
        1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
        116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
        124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
        47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
        154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
        108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
        242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
        239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
        50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
        141, 128, 195, 78, 66, 215, 61, 156, 180
      ];
      // To remove the need for index wrapping, double the permutation table length
      var perm = new Array(512);
      var gradP = new Array(512);
      // This isn't a very good seeding function, but it works ok. It supports 2^16
      // different seed values. Write something better if you need more seeds.
      module.seed = function (seed) {
        if (seed > 0 && seed < 1) {
          // Scale the seed out
          seed *= 65536;
        }
        seed = Math.floor(seed);
        if (seed < 256) {
          seed |= seed << 8;
        }
        for (var i = 0; i < 256; i++) {
          var v;
          if (i & 1) {
            v = p[i] ^ (seed & 255);
          } else {
            v = p[i] ^ ((seed >> 8) & 255);
          }
          perm[i] = perm[i + 256] = v;
          gradP[i] = gradP[i + 256] = grad3[v % 12];
        }
      };
      module.seed(0);
      /*
        for(var i=0; i<256; i++) {
          perm[i] = perm[i + 256] = p[i];
          gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
        }*/
      // Skewing and unskewing factors for 2, 3, and 4 dimensions
      var F2 = 0.5 * (Math.sqrt(3) - 1);
      var G2 = (3 - Math.sqrt(3)) / 6;
      var F3 = 1 / 3;
      var G3 = 1 / 6;
      // 2D simplex noise
      module.simplex2 = function (xin, yin) {
        var n0, n1, n2; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
        var y0 = yin - j + t;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
          // lower triangle, XY order: (0,0)->(1,0)->(1,1)
          i1 = 1;
          j1 = 0;
        } else {
          // upper triangle, YX order: (0,0)->(0,1)->(1,1)
          i1 = 0;
          j1 = 1;
        }
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1 + 2 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        i &= 255;
        j &= 255;
        var gi0 = gradP[i + perm[j]];
        var gi1 = gradP[i + i1 + perm[j + j1]];
        var gi2 = gradP[i + 1 + perm[j + 1]];
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
          n0 = 0;
        } else {
          t0 *= t0;
          n0 = t0 * t0 * gi0.dot2(x0, y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
          n1 = 0;
        } else {
          t1 *= t1;
          n1 = t1 * t1 * gi1.dot2(x1, y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
          n2 = 0;
        } else {
          t2 *= t2;
          n2 = t2 * t2 * gi2.dot2(x2, y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70 * (n0 + n1 + n2);
      };
      // 3D simplex noise
      module.simplex3 = function (xin, yin, zin) {
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
        var y0 = yin - j + t;
        var z0 = zin - k + t;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
          if (y0 >= z0) {
            i1 = 1;
            j1 = 0;
            k1 = 0;
            i2 = 1;
            j2 = 1;
            k2 = 0;
          } else if (x0 >= z0) {
            i1 = 1;
            j1 = 0;
            k1 = 0;
            i2 = 1;
            j2 = 0;
            k2 = 1;
          } else {
            i1 = 0;
            j1 = 0;
            k1 = 1;
            i2 = 1;
            j2 = 0;
            k2 = 1;
          }
        } else {
          if (y0 < z0) {
            i1 = 0;
            j1 = 0;
            k1 = 1;
            i2 = 0;
            j2 = 1;
            k2 = 1;
          } else if (x0 < z0) {
            i1 = 0;
            j1 = 1;
            k1 = 0;
            i2 = 0;
            j2 = 1;
            k2 = 1;
          } else {
            i1 = 0;
            j1 = 1;
            k1 = 0;
            i2 = 1;
            j2 = 1;
            k2 = 0;
          }
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
        var y2 = y0 - j2 + 2 * G3;
        var z2 = z0 - k2 + 2 * G3;
        var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
        var y3 = y0 - 1 + 3 * G3;
        var z3 = z0 - 1 + 3 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        i &= 255;
        j &= 255;
        k &= 255;
        var gi0 = gradP[i + perm[j + perm[k]]];
        var gi1 = gradP[i + i1 + perm[j + j1 + perm[k + k1]]];
        var gi2 = gradP[i + i2 + perm[j + j2 + perm[k + k2]]];
        var gi3 = gradP[i + 1 + perm[j + 1 + perm[k + 1]]];
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) {
          n0 = 0;
        } else {
          t0 *= t0;
          n0 = t0 * t0 * gi0.dot3(x0, y0, z0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) {
          n1 = 0;
        } else {
          t1 *= t1;
          n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) {
          n2 = 0;
        } else {
          t2 *= t2;
          n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) {
          n3 = 0;
        } else {
          t3 *= t3;
          n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 32 * (n0 + n1 + n2 + n3);
      };
      // ##### Perlin noise stuff
      function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
      }
      function lerp(a, b, t) {
        return (1 - t) * a + t * b;
      }
      // 2D Perlin Noise
      module.perlin2 = function (x, y) {
        // Find unit grid cell containing point
        var X = Math.floor(x),
          Y = Math.floor(y);
        // Get relative xy coordinates of point within that cell
        x = x - X;
        y = y - Y;
        // Wrap the integer cells at 255 (smaller integer period can be introduced here)
        X = X & 255;
        Y = Y & 255;
        // Calculate noise contributions from each of the four corners
        var n00 = gradP[X + perm[Y]].dot2(x, y);
        var n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
        var n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
        var n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);
        // Compute the fade curve value for x
        var u = fade(x);
        // Interpolate the four results
        return lerp(lerp(n00, n10, u), lerp(n01, n11, u), fade(y));
      };
      // 3D Perlin Noise
      module.perlin3 = function (x, y, z) {
        // Find unit grid cell containing point
        var X = Math.floor(x),
          Y = Math.floor(y),
          Z = Math.floor(z);
        // Get relative xyz coordinates of point within that cell
        x = x - X;
        y = y - Y;
        z = z - Z;
        // Wrap the integer cells at 255 (smaller integer period can be introduced here)
        X = X & 255;
        Y = Y & 255;
        Z = Z & 255;
        // Calculate noise contributions from each of the eight corners
        var n000 = gradP[X + perm[Y + perm[Z]]].dot3(x, y, z);
        var n001 = gradP[X + perm[Y + perm[Z + 1]]].dot3(x, y, z - 1);
        var n010 = gradP[X + perm[Y + 1 + perm[Z]]].dot3(x, y - 1, z);
        var n011 = gradP[X + perm[Y + 1 + perm[Z + 1]]].dot3(x, y - 1, z - 1);
        var n100 = gradP[X + 1 + perm[Y + perm[Z]]].dot3(x - 1, y, z);
        var n101 = gradP[X + 1 + perm[Y + perm[Z + 1]]].dot3(x - 1, y, z - 1);
        var n110 = gradP[X + 1 + perm[Y + 1 + perm[Z]]].dot3(x - 1, y - 1, z);
        var n111 = gradP[X + 1 + perm[Y + 1 + perm[Z + 1]]].dot3(
          x - 1,
          y - 1,
          z - 1
        );
        // Compute the fade curve value for x, y, z
        var u = fade(x);
        var v = fade(y);
        var w = fade(z);
        // Interpolate
        return lerp(
          lerp(lerp(n000, n100, u), lerp(n001, n101, u), w),
          lerp(lerp(n010, n110, u), lerp(n011, n111, u), w),
          v
        );
      };
      return module
    },
    clearDataDisplay(){
      this.svg.select("#nodes_temperature_node").remove()
      this.svg.select("#nodes_temperature_data").remove()
    },
    clear(){
      if (this.zoom != ''){
        d3.select("#new").remove()
        d3.select("#viz").call(this.zoom.transform, d3.zoomIdentity)
      }
    },
    logs () {
      console.log(d3.select("#new").node())
    }

  }
}


</script>
import urls from './urls'
import axios from 'axios'
import * as d3 from 'd3'

export default {
    getUrlParams (urlStr) {
      if (typeof urlStr == "undefined") {
        var url = decodeURI(location.search)
       } else {
        var url = "?" + urlStr.split("?")[1]
       }
       var theRequest = new Object()
       if (url.indexOf("?") != -1) {
        var str = url.substr(1)
        var strs = str.split("&")
        for (var i = 0; i < strs.length; i++) {
          theRequest[strs[i].split("=")[0]] = decodeURI(strs[i].split("=")[1])
        }
       }
       return theRequest
    },
    getTime (time_stamp) {
      let yy = new Date().getFullYear();
      let mm = new Date().getMonth()+1;
      let dd = new Date().getDate();
      let hh = new Date().getHours()
      let mf = new Date().getMinutes()<10 ? '0'+new Date().getMinutes() : new Date().getMinutes();
      let ss = new Date().getSeconds()<10 ? '0'+new Date().getSeconds() : new Date().getSeconds();
      return yy+'-'+mm+'-'+dd+' '+hh+':'+mf+':'+ss
    },
    getTimeHour (time_stamp) {
      // let yy = new Date().getFullYear();
      // let mm = new Date().getMonth()+1;
      // let dd = new Date().getDate();
      let hh = new Date(time_stamp).getHours()
      let mf = new Date(time_stamp).getMinutes()<10 ? '0'+new Date(time_stamp).getMinutes() : new Date(time_stamp).getMinutes();
      let ss = new Date(time_stamp).getSeconds()<10 ? '0'+new Date(time_stamp).getSeconds() : new Date(time_stamp).getSeconds();
      return hh+':'+mf+':'+ss
    },
    colorRGBtoHex(color) {
      var rgb = color.split(',')
      var r = parseInt(rgb[0].split('(')[1])
      var g = parseInt(rgb[1])
      var b = parseInt(rgb[2].split(')')[0])
      var hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
      return hex
    },
    setBrowserTitle(val){
      document.title = "Edit "+val
    },
    generateUUID() {
      var d = new Date().getTime()
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0
        d = Math.floor(d/16)
        return (c=='x' ? r : (r&0x3|0x8)).toString(16)
      })
      return 'a'+uuid
    },

    getChartConfig(names, data, xaxis){
      return {
        title: {
            text: 'chart'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: names
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {}
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xaxis
        },
        yAxis: {
            type: 'value',
        },
        series: data
      }
    },

    sliceYAxisQueueHandle(data, slice_num){
      if(data.length < slice_num){
        return new Array(slice_num-data.length).fill(0).concat(data)
      }else{
        return data.slice(data.length - slice_num, data.length)
      }
    },

    sliceXAxisQueueHandle(refresh_interval, slice_num){
      let tmp = []
      let cur_time = Date.parse(new Date())
      for(let i=0;i<slice_num;i++){
        tmp.push(this.getTimeHour(cur_time - (slice_num-i)*refresh_interval))
      }
      return tmp
    },

    historyOperatePush(pool, operate_type, ins){
      if(operate_type === 'create'){
        pool.push({'type': operate_type, 'ins': ins})
      }else if(operate_type === 'update'){
        if(!ins.select('path').empty()){
          pool.push({'type': operate_type, 'ins': ins, 'origin_value': ins.select('.children').attr("d")})
        }else if(!ins.select('polygon').empty()){
          pool.push({'type': operate_type, 'ins': ins, 'origin_value': ins.select('.children').attr("points")})
        }else if(!ins.select('text').empty()){
          pool.push({'type': operate_type, 'ins': ins, 'origin_value': ins.select('.children').text()})
        }
      }else if(operate_type === 'move'){
        pool.push({'type': operate_type, 'ins': ins['ins'], 'origin_value': ins['origin_value']})
      }
    },

    historyOperatePop(pool){
      if(pool.length > 0){
        let tmp = pool.pop()
        if(tmp['type'] === 'create'){
          tmp['ins'].remove()
        }else if(tmp['type'] === 'update'){
          if(!tmp['ins'].select('path').empty()){
            tmp['ins'].select('.children').attr("d", tmp['origin_value'])
          }else if(!tmp['ins'].select('polygon').empty()){
            tmp['ins'].select('.children').attr("points", tmp['origin_value'])
          }else if(!tmp['ins'].select('text').empty()){
            tmp['ins'].select('.children').text(tmp['origin_value'])
          }
        }else if(tmp['type'] === 'move'){
          tmp['ins'].attr("transform", `matrix(1 0 0 1 ${tmp['origin_value'].x} ${tmp['origin_value'].y})`)
        }
      }
    },
}


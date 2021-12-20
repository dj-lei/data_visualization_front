// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'

import service from '@/plugins/http'
import urls from '@/plugins/urls'
import common from '@/plugins/common'

Vue.config.productionTip = false
Vue.use(Vuetify)

Vue.prototype.$http = service
Vue.prototype.$urls = urls
Vue.prototype.$common = common

new Vue({
  vuetify: new Vuetify(),
  render: h => h(App)
}).$mount('#app')

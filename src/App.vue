<template>
  <div id="app">
    <v-app dark>
      <DataVisualization/>
    </v-app>
  </div>
</template>

<script>
import DataVisualization from './components/DataVisualization'

export default {
  name: 'App',
  components: {
    DataVisualization
  }
}
</script>

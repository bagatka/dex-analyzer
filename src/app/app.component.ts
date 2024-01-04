import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HttpClientModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly httpClient = inject(HttpClient);
  feeData: number[] = [];
  wethInPoolData: number[] = [];
  labels: string[] = [];
  movingAverageBlockTimeData: Array<number | null> = [];
  form = inject(FormBuilder).group({
    movingAverageFactor: [4],
    poolAddress: ['0xadea9b0c84898142748268253fe9f1c05ba9c296']
  });
  chart?: Chart;

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  renderChart() {
    this.chart?.clear();
    this.chart?.destroy();
    this.chart = undefined;

    this.labels = [];
    this.feeData = [];
    this.wethInPoolData = [];
    this.movingAverageBlockTimeData = [];

    const movingAverageFactor = this.form.get('movingAverageFactor')?.getRawValue();
    const poolAddress = this.form.get('poolAddress')?.getRawValue();

    this.httpClient.get(`https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${wethAddress}&address=${poolAddress}&startblock=0&endblock=28922248&sort=asc&apikey=JKZX1IQUGNZR8CAXGG8NN9KD3BAWMEPF4H`)
      .subscribe((data: any) => {
        // const addLiquidityTx = data.result.shift();
        const rawData = data.result.map((x: any) => {
          let value;

          if (x.from.toLowerCase() === poolAddress) {
              value = -Number(x.value);
          } else {
            value = Number(x.value);
          }

          return {
            value: value,
            blockNumber: x.blockNumber,
            fee: Number(x.gasPrice) * Number(x.gasUsed),
            hash: x.hash
          }
        });

        const groups = groupBy(rawData, (x: any) => x.blockNumber);

        let lastValue = 0;
        let feeSum = 0; //Number(addLiquidityTx.gasPrice) * Number(addLiquidityTx.gasUsed);
        let movingAverageBuffer: number[] = [];
        let lastBlockNumber = 0;
        for (let key in groups) {
          const group = groups[key];
          this.labels.push(key);
          const total = group.reduce((acc, x) => acc + x.value, 0) / 10**18;
          const txGroups = groupBy(group, (x: any) => x.hash);
          console.log(txGroups);
          let fee = 0;
          for (let txKey in txGroups) {
            fee = txGroups[txKey].reduce((acc, x) => acc + x.fee, 0) / 10**18;
          }
          lastValue += total;
          feeSum += fee;
          this.feeData.push(feeSum);
          this.wethInPoolData.push(lastValue);

          if (this.movingAverageBlockTimeData.length === 0) {
            this.movingAverageBlockTimeData.push(null);
            lastBlockNumber = Number(key);
            movingAverageBuffer.push(null!);
            continue;
          }

          if (movingAverageBuffer.length === movingAverageFactor) {
            movingAverageBuffer.shift();
            movingAverageBuffer.push((Number(key) - lastBlockNumber) * 12);
            this.movingAverageBlockTimeData.push(movingAverageBuffer.reduce((acc, x) => acc + x, 0) / movingAverageFactor);
            lastBlockNumber = Number(key);
          } else {
            movingAverageBuffer.push((Number(key) - lastBlockNumber) * 12);
            lastBlockNumber = Number(key);
            this.movingAverageBlockTimeData.push(null);
          }
        }

        console.log(this.movingAverageBlockTimeData);
        const ctx = this.canvas.nativeElement;

        const config = {
          type: 'line' as const,
          data: {
            labels: this.labels,
            datasets: [{
              label: 'WETH in pool',
              data: this.wethInPoolData,
              yAxisID: 'y',
            }, {
              label: 'Fees',
              data: this.feeData,
              yAxisID: 'y',
            }, {
              label: 'Block time',
              data: this.movingAverageBlockTimeData,
              yAxisID: 'y1',
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Chart.js Floating Bar Chart'
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
              },
              y1: {
                type: 'logarithmic',
                display: true,
                position: 'right',

                // grid line settings
                grid: {
                  drawOnChartArea: false, // only want the grid lines for one axis to show up
                },
              },
            }
          }
        };

        this.chart = new Chart(ctx, config as any);
        Chart.register(...registerables);
    });
  }


  renderChartWethFees() {
    this.chart?.clear();
    this.chart?.destroy();
    this.chart = undefined;

    this.labels = [];
    this.feeData = [];
    this.wethInPoolData = [];
    this.movingAverageBlockTimeData = [];

    const movingAverageFactor = this.form.get('movingAverageFactor')?.getRawValue();
    const poolAddress = this.form.get('poolAddress')?.getRawValue();

    this.httpClient.get(`https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${wethAddress}&address=${poolAddress}&startblock=0&endblock=28922248&sort=asc&apikey=JKZX1IQUGNZR8CAXGG8NN9KD3BAWMEPF4H`)
      .subscribe((data: any) => {
        // const addLiquidityTx = data.result.shift();
        console.log(data.result);
        // console.log(data.result.sort((x: any) => Number(x.gasPrice) * Number(x.gasUsed)));
        const rawData = data.result.map((x: any) => {
          let value;

          if (x.from.toLowerCase() === poolAddress.toLowerCase()) {
              value = -Number(x.value);
          } else {
            value = Number(x.value);
          }

          return {
            value: value,
            blockNumber: x.blockNumber,
            fee: Number(x.gasPrice) * Number(x.gasUsed),
            hash: x.hash
          }
        });

        const groups = groupBy(rawData, (x: any) => x.blockNumber);

        const newData: Array<{x: number, y: number}> = [];

        let lastValue = 0;
        let feeSum = 0; //Number(addLiquidityTx.gasPrice) * Number(addLiquidityTx.gasUsed);
        for (let key in groups) {
          const group = groups[key];
          this.labels.push(key);
          const total = group.reduce((acc, x) => acc + x.value, 0) / 10**18;
          const txGroups = groupBy(group, (x: any) => x.hash);
          let fee = 0;
          for (let txKey in txGroups) {
            fee = txGroups[txKey].reduce((acc, x) => acc + x.fee, 0) / 10**18;
          }
          lastValue += total;
          feeSum += fee;
          newData.push({x: feeSum, y: lastValue});
        }

        const ctx = this.canvas.nativeElement;

        const config = {
          type: 'scatter' as const,
          data: {
            datasets: [{
                label: 'WETH in pool',
                data: newData,
                showLine: true
            }]
          },
          options: {
            scales: {
              x: {
                type: 'linear',
                position: 'bottom'
              },
              y: {
                type: 'linear',
                position: 'left'
              }
            }
          }
        };

        this.chart = new Chart(ctx, config as any);
        Chart.register(...registerables);
    });
  }

  renderChart3() {
    this.chart?.clear();
    this.chart?.destroy();
    this.chart = undefined;

    this.labels = [];
    this.feeData = [];
    this.wethInPoolData = [];
    this.movingAverageBlockTimeData = [];

    const movingAverageFactor = this.form.get('movingAverageFactor')?.getRawValue();
    const poolAddress = this.form.get('poolAddress')?.getRawValue();

    this.httpClient.get(`https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${wethAddress}&address=${poolAddress}&startblock=0&endblock=28922248&sort=asc&apikey=JKZX1IQUGNZR8CAXGG8NN9KD3BAWMEPF4H`)
      .subscribe((data: any) => {
        // const addLiquidityTx = data.result.shift();
        const rawData = data.result.map((x: any) => {
          let value;

          if (x.from.toLowerCase() === poolAddress) {
              value = -Number(x.value);
          } else {
            value = Number(x.value);
          }

          return {
            value: value,
            blockNumber: x.blockNumber,
            fee: Number(x.gasPrice) * Number(x.gasUsed),
            hash: x.hash
          }
        });

        const groups = groupBy(rawData, (x: any) => x.blockNumber);

        const wethDivFees: number[] = [];
        let lastValue = 0;
        let feeSum = 0; //Number(addLiquidityTx.gasPrice) * Number(addLiquidityTx.gasUsed);
        for (let key in groups) {
          const group = groups[key];
          this.labels.push(key);
          const total = group.reduce((acc, x) => acc + x.value, 0) / 10**18;
          const txGroups = groupBy(group, (x: any) => x.hash);
          console.log(txGroups);
          let fee = 0;
          for (let txKey in txGroups) {
            fee = txGroups[txKey].reduce((acc, x) => acc + x.fee, 0) / 10**18;
          }
          lastValue += total;
          feeSum += fee;
          this.feeData.push(feeSum);
          this.wethInPoolData.push(lastValue);
          wethDivFees.push(lastValue / feeSum);
        }
        const ctx = this.canvas.nativeElement;

        const config = {
          type: 'line' as const,
          data: {
            labels: this.labels,
            datasets: [{
              label: 'WETH in pool',
              data: this.wethInPoolData,
              yAxisID: 'y',
            }, {
              label: 'WETH/Fees',
              data: wethDivFees,
              yAxisID: 'y1',
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Chart.js Floating Bar Chart'
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',

                // grid line settings
                grid: {
                  drawOnChartArea: false, // only want the grid lines for one axis to show up
                },
              },
            }
          }
        };

        this.chart = new Chart(ctx, config as any);
        Chart.register(...registerables);
    });
  }
}

const groupBy = <T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });

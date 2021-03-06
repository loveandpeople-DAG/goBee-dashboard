import * as React from 'react';
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import NodeStore from "app/stores/NodeStore";
import {inject, observer} from "mobx-react";
import Card from "react-bootstrap/Card";
import {Line} from "react-chartjs-2";
import {defaultChartOptions} from "app/misc/Chart";
import {If} from "tsx-control-statements/components";
import Badge from "react-bootstrap/Badge";
import * as style from '../../assets/main.css';

interface Props {
    nodeStore?: NodeStore;
}

// 1 MB in bytes
const MB_TO_BYTES = 1024 * 1024;
// 1 GB in bytes
const GB_TO_BYTES = MB_TO_BYTES * 1024;

const lineChartOptions = Object.assign({
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                fontSize: 8,
            },
            gridLines: {
                display: false
            }
        }],
        yAxes: [{
            gridLines: {
                display: false
            },
            ticks: {
                maxTicksLimit: 4,
                suggestedMin: 0,
                beginAtZero: true,
            },
        }],
    },
}, defaultChartOptions);

const reqLineChartOptions = Object.assign({
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                fontSize: 8,
            },
            gridLines: {
                display: false
            }
        }],
        yAxes: [{
            gridLines: {
                display: false
            },
            ticks: {
                callback: function (value, index, values) {
                    return Math.abs(value);
                },
                maxTicksLimit: 4,
                suggestedMin: 0,
                beginAtZero: true,
            },
        }],
    },
    tooltips: {
        callbacks: {
            label: function (tooltipItem, data) {
                let label = data.datasets[tooltipItem.datasetIndex].label;
                return `${label} ${Math.abs(tooltipItem.value)}`;
            }
        }
    }
}, defaultChartOptions);

const dbSizeLineChartOptsMB = Object.assign({}, {
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                fontSize: 8,
            },
            showXLabels: 10,
            gridLines: {
                display: false
            }
        }],
        yAxes: [{
            gridLines: {
                display: false
            },
            ticks: {
                fontSize: 10,
                maxTicksLimit: 4,
                suggestedMin: 0,
                beginAtZero: true,
                callback: function (value, index, values) {
                    return `${(value / MB_TO_BYTES).toFixed(3)} MB`;
                }
            },
        }],
    },
    tooltips: {
        callbacks: {
            label: function (tooltipItem, data) {
                let label = data.datasets[tooltipItem.datasetIndex].label;
                return `${label}: ${(tooltipItem.value / MB_TO_BYTES).toFixed(3)} MB`;
            }
        }
    }
}, defaultChartOptions);

const dbSizeLineChartOptsGB = Object.assign({}, dbSizeLineChartOptsMB, {
    scales: {
        yAxes: [{
            gridLines: {
                display: false
            },
            ticks: {
                fontSize: 10,
                maxTicksLimit: 4,
                suggestedMin: 0,
                beginAtZero: true,
                callback: function (value, index, values) {
                    return `${(value / GB_TO_BYTES).toFixed(3)} GB`;
                }
            },
        }],
    },
    tooltips: {
        callbacks: {
            label: function (tooltipItem, data) {
                let label = data.datasets[tooltipItem.datasetIndex].label;
                return `${label}: ${(tooltipItem.value / GB_TO_BYTES).toFixed(3)} GB`;
            }
        }
    }
});

@inject("nodeStore")
@observer
export class Misc extends React.Component<Props, any> {
    updateInterval: any;

    constructor(props: Readonly<Props>) {
        super(props);
        this.state = {
            topicsRegistered: false,
        };
    }

    componentDidMount(): void {
        this.updateInterval = setInterval(() => this.updateTick(), 500);
        this.props.nodeStore.registerMiscTopics();
    }

    componentWillUnmount(): void {
        clearInterval(this.updateInterval);
        this.setState({topicsRegistered: false})
        this.props.nodeStore.unregisterMiscTopics();
    }

    updateTick = () => {
        if (this.props.nodeStore.websocketConnected && !this.state.topicsRegistered) {
            this.props.nodeStore.registerMiscTopics();
            this.setState({topicsRegistered: true})
        }

        if (!this.props.nodeStore.websocketConnected && this.state.topicsRegistered) {
            this.setState({topicsRegistered: false})
        }
    }

    useGB = (dbSize: number) => {
        return dbSize > GB_TO_BYTES;
    }

    getDatabaseSize = () => {
        const { tangle, snapshot, spent } = this.props.nodeStore.last_dbsize_metric;
        const totalSize = tangle + snapshot + spent;

        if (this.useGB(totalSize)) {
            return `${(totalSize / GB_TO_BYTES).toFixed(3)} GB`;
        }
        return `${(totalSize / MB_TO_BYTES).toFixed(3)} MB`;
    }

    render() {
        const { tangle, snapshot, spent } = this.props.nodeStore.last_dbsize_metric;
        const dbSize = tangle + snapshot + spent;

        return (
            <Container fluid>
                <h3>Misc</h3>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Tip-Selection Performance</Card.Title>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.tipSelSeries}
                                          options={lineChartOptions}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <If condition={this.props.nodeStore.spamMetricsSeries.labels.length > 0}>
                    <Row className={"mb-3"}>
                        <Col>
                            <Card>
                                <Card.Body>
                                    <Card.Title>Spammer Metrics</Card.Title>
                                    <small>
                                        GTTA: {this.props.nodeStore.last_spam_metric.gtta.toFixed(3)}s,
                                        PoW: {this.props.nodeStore.last_spam_metric.pow.toFixed(3)}s,
                                        Total: {(this.props.nodeStore.last_spam_metric.gtta + this.props.nodeStore.last_spam_metric.pow).toFixed(3)}s
                                    </small>
                                    <div className={style.hornetChart}>
                                        <Line data={this.props.nodeStore.spamMetricsSeries}
                                            options={lineChartOptions}/>
                                    </div>
                                    <If condition={this.props.nodeStore.avgSpamMetricsSeries.labels.length > 0}>
                                    <small>
                                        New TX: {this.props.nodeStore.last_avg_spam_metric.new.toFixed(3)},
                                        Avg. TPS: {this.props.nodeStore.last_avg_spam_metric.avg.toFixed(3)}
                                    </small>
                                    <div className={style.hornetChart}>
                                        <Line data={this.props.nodeStore.avgSpamMetricsSeries}
                                            options={lineChartOptions}/>
                                    </div>
                                    </If>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </If>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Request Queue</Card.Title>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.reqQSizeSeries}
                                          options={lineChartOptions}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Server Metrics</Card.Title>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.serverMetricsSeries}
                                          options={lineChartOptions}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Cache Sizes</Card.Title>
                                <small>
                                    The cache size shrinks whenever an eviction happens.
                                    Note that the sizes are sampled only every second, so you won't necessarily
                                    see the cache hitting its capacity.
                                </small>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.cacheMetricsSeries}
                                          options={reqLineChartOptions}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Requests</Card.Title>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.stingReqs}
                                          options={reqLineChartOptions}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className={"mb-3"}>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Card.Title>Database</Card.Title>
                                <If condition={!!this.props.nodeStore.last_dbsize_metric.tangle}>
                                    <Container className={"d-flex justify-content-between align-items-center"}>
                                        <small>
                                            Size: {this.getDatabaseSize()}
                                            <If condition={this.props.nodeStore.lastDatabaseCleanupDuration > 0}>
                                                <br/>
                                                {"Last GC: "} {this.props.nodeStore.lastDatabaseCleanupEnd} {". Took: "}{this.props.nodeStore.lastDatabaseCleanupDuration}{" seconds."}
                                                <br/>
                                            </If>
                                        </small>
                                        <If condition={this.props.nodeStore.isRunningDatabaseCleanup}>
                                            <Badge variant="danger">GC running</Badge>
                                        </If>
                                    </Container>
                                </If>
                                <div className={style.hornetChart}>
                                    <Line data={this.props.nodeStore.dbSizeSeries}
                                        options={this.useGB(dbSize) ? dbSizeLineChartOptsGB : dbSizeLineChartOptsMB}/>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        );
    }
}

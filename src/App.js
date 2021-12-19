import 'antd/dist/antd.css';
import React, { Component, Fragment } from 'react'
import { Typography, Button, Skeleton, Space, message, AutoComplete, Row, Col, Input, Divider } from 'antd';
import { nanoid } from 'nanoid';

const electron = window.require('electron');
const {ipcRenderer} = electron;const { Text, Title } = Typography;
const SINGLERE = /,|{/
const MUTILERE = /,/
const RANGERE = /{[0-9]+-[0-9]+}/

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      value: "",
      opvalue: "",
      text: "",
      clickable: false,
      pid: [],
      start: "",
      result: "",
      startTime: "",
      errHosts: [],
    }
    this.pingListener = this.pingListener.bind(this)
  }

  componentDidMount() {
    ipcRenderer.on('ping-result', this.pingListener);
  }

  pingListener(event, data, errHosts = []) {
    let { text, pid } = this.state
    let dataArr = data.split("^")
    let pre = dataArr[0]
    let hosts = dataArr[1]
    if (pre == "start") {
      let newText = Object.assign({}, text, { [hosts]: `${dataArr[1]}:\n` })
      this.setState({ text: newText })
      return
    } else if (pre == "mess") {
      let mess = dataArr[2]
      let oldMess = text[hosts]
      let newMess = oldMess + mess
      let newText = Object.assign({}, text, { [hosts]: newMess })
      this.setState({ text: newText })
    } else if (pre == "pid") {
      this.setState({ pid: [...pid, hosts] })
    }
    if (data == "done") {
      message.success({
        key: "ping",
        content: "ping结束",
        duration: 2,
      })
      this.setState({ clickable: false, errHosts, result: `有${errHosts.length}台主机ping失败` })
    }
  }

  parseAddress(value) {
    let _value = []
    switch (true) {
      case (!SINGLERE.test(value)):
        _value.push(value)
        break;
      case MUTILERE.test(value):
        _value = value.split(",")
        break
      case RANGERE.test(value):
        let _t = value.split('.')
        if (_t.length !== 4) {
          return "error"
        }
        let ip_pre = [_t[0], _t[1], _t[2]].join(".")
        let _pre = _t[3].split("{")[0]
        let _x
        if (_pre == "") {
          _x = _t[3].replace("{", "").replace("}", "").split("-")
        } else {
          _x = _t[3].replace(_pre, "").replace("{", "").replace("}", "").split("-")
        }
        if (_x.length !== 2 | _x[0] > _x[1]) {
          return "error"
        }
        let _n
        let start = _x[0]
        let end = _x[1]

        for (let i = Number(start); i <= end; i++) {
          let _j
          if (start.includes("0") && i < 10) {
            _j = "0" + i
          } else {
            _j = i
          }
          _n = _pre + _j
          if (_n > 254) {
            continue
          }
          _value.push(ip_pre + "." + _n)
        }

        break
      default:
        return "error"
    }
    return _value
  }

  onChange = (event) => {
    this.setState({ value: event.target.value })
  };

  run = () => {
    let { value, opvalue } = this.state
    if (!value) {
      message.error("地址不能为空", 1)
      return
    }
    let _value = this.parseAddress(value)
    if (_value == "error") {
      message.error("地址解析错误", 1)
      return
    }
    console.log("地址组:", _value);
    this.setState({ clickable: true, text: "" })
    message.loading(
      {
        key: "ping",
        content: "开始ping......",
        duration: 0,
      }

    )
    if (opvalue) {
      opvalue = opvalue.split(/\s+/)
    }
    ipcRenderer.send("Ping", opvalue, _value, false)
    this.setState({ start: `开始ping,一共有${_value.length}台主机`, startTime: (new Date().getTime()), result: "", errHosts: [] })

  }
  optionsChange = (data) => {
    this.setState({ 'opvalue': data.target.value })
  }

  cancle = () => {
    const cancle = ipcRenderer.sendSync('cancle-ping', this.state.pid)
    if (cancle) {
      message.success(
        {
          key: "ping",
          content: "取消成功!",
          duration: 0,
        })
    }
  }

  render() {
    const { value, opvalue, text, clickable, start, result, errHosts, startTime } = this.state
    return (
      <Fragment>
        <Row>
          <Space>
            <Col >
              <Text style={{marginLeft: '20px'}} strong>地址:</Text>
            </Col>
            <Col>
              <Input
                value={value}
                style={{
                  width: 500,
                }}
                onChange={this.onChange}
                placeholder="请输入地址"
              />
            </Col>
            <Col>
              <Col>
                <Text strong>选项:</Text>
              </Col>
            </Col>
            <Col>
              <Input value={opvalue} onChange={this.optionsChange} placeholder='请输入选项' />
            </Col>
            <Col>
              <Button type='primary' disabled={clickable} onClick={this.run} >运行</Button>
            </Col>
            <Col>
              <Button type='primary' danger disabled={!clickable} onClick={this.cancle} >取消</Button>
            </Col>
          </Space>
        </Row>
        <Divider />
        <div style={{ float: 'left', marginLeft: '20px' }}>
          <div style={{ overflow: 'auto', margin: 5, height: 500, width: 500, float: 'left' }}>
            {
              text == "" ? <Fragment /> :
                Object.keys(text).map(key => <Fragment key={nanoid()} ><p style={{ whiteSpace: 'pre-wrap' }}>{text[key]}</p><Divider /></Fragment>)
            }
          </div>
          <div style={{ width: 400, margin: 5, float: 'left', textAlign: 'left' }}>
            <Title>地址规则:</Title>
            <Text strong>
              单地址:ip地址或者主机名(8.8.8.8或www.baidu.com)
            </Text>
            <br />
            <Text strong>
              多地址:
              <br />
              8.8.8.8,www.baidu.com -&gt; 以逗号分割目标
            </Text>
            <br />
            <Text strong>
              8.8.8.20{"{1-5}"} -&gt; 解析为8.8.8.201...8.8.8.205
            </Text>
            <Divider />
            {start == "" ? <Fragment /> : <Text strong>{start}</Text>}
            <br />
            {result == "" ? <Fragment /> : <Text strong>{result}</Text>}
            <br />
            {errHosts.length < 1 ? <Fragment /> :
              errHosts.map(item => {
                return <Fragment key={nanoid()}><Text strong>{item}</Text><br /></Fragment>
              })
            }
            <br />
            {result == "" ? <Fragment /> : <Text strong>{`任务结束,用时:${Math.round(((new Date()).getTime() - startTime) / 1000)}秒`}</Text>}
          </div>
        </div>
      </Fragment>)}
}
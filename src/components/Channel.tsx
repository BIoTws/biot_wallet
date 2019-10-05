import React, { Component } from 'react';
import "../styles/channel.scss";

class Channel extends Component {
    render() {
        return (
            <div>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                    fontSize: "21px"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#ffffff"
                    }}>
                        <div className="topmenu_action">
                            <div className="topmenu_action-arrow" />
                        </div>
                        <div style={{ paddingLeft: 20, width: "100%" }}>Bob</div>
                    </div>
                    <div className="line" />
                </div>
                <div className="Channel__wallet">
                    uNRSPy/GtLLn270YFH14...
                </div>
                <div className="inner">
                    <div className="Channel__members">
                        <div className="Channel__member">
                            <div className="Channel__member-name">Jack:</div>
                            <div className="Channel__member-value">1400 BC</div>
                        </div>
                        <div className="Channel__member">
                            <div className="Channel__member-name">Bob:</div>
                            <div className="Channel__member-value">240 BC</div>
                        </div>
                    </div>
                    <div className="Channel__close">
                        <button className="Channel__close-btn">Close channel</button>
                        <div className="Channel__close-descr">This action cannot be undone</div>
                    </div>
                    <div className="Channel__title">Transactions</div>
                    <div className="Channel__transactions">
                        <div className="Channel__transaction Channel__first">
                            <div className="Channel__transaction-name">Jack</div>
                            <div className="Channel__transaction-info">
                                <div className="Channel__transaction-value">240 BC</div>
                                <div className="Channel__transaction-date">28.07.2019 15:17</div>
                            </div>
                        </div>
                        <div className="Channel__transaction Channel__second">
                            <div className="Channel__transaction-name">Bob</div>
                            <div className="Channel__transaction-info">
                                <div className="Channel__transaction-value">1400 BC</div>
                                <div className="Channel__transaction-date">28.07.2019 15:17</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Channel;
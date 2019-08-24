import * as React from "react";
import "../styles/wallets-list.scss";
import getBiot from "../getBiot";

interface IState {
  currentWallet: string;
  coin: string;
  wallets: Array<IWallet>;
  balance: number;
}

interface IWallet {
  name: string;
  id: number;
  coin: string;
  balance: number;
}

interface walletsProps {
  setPage: (page, walletId) => void;
}

export class CreateWallet extends React.Component<any, IState> {
  constructor(props: any) {
    super(props);

    this.state = {
      balance: 0,
      currentWallet: "",
      coin: "Byteball",
      wallets: []
    };
  }

  public handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    this.props.addWallet(
      this.state.currentWallet,
      this.state.coin,
      this.state.balance
    );
  }

  public render(): JSX.Element {
    return (
      <div>
        <form onSubmit={e => this.handleSubmit(e)}>
          <input
            required={true}
            type="text"
            className="tdl-input"
            placeholder="Wallet name"
            value={this.state.currentWallet}
            onChange={e => this.setState({ currentWallet: e.target.value })}
          />
          <br />
          <button className={"button-submit"} type="submit">
            Add
          </button>
        </form>
      </div>
    );
  }
}

export class WalletsList extends React.Component<walletsProps, any> {
  state = { show: false, wallets: [], page: "wallets", name: "" };

  addWallet = () => {
    let name = this.state.name;
    getBiot(async (biot: any) => {
      let walletId = await biot.core.createNewWallet();
      let balance = await biot.core.getWalletBalance(walletId);
      if (!name) name = walletId.substr(0, 25) + "...";
      let lWN = localStorage.getItem("assocWalletToName");
      let assocWalletToName = lWN ? JSON.parse(lWN) : {};
      assocWalletToName[walletId] = name;
      window.localStorage.setItem(
        "assocWalletToName",
        JSON.stringify(assocWalletToName)
      );

      this.setState({
        show: false,
        wallets: [
          ...this.state.wallets,
          {
            id: walletId,
            name: name,
            coin: "Byteball",
            balance: balance.base.stable + balance.base.pending
          }
        ],
        page: "wallets",
        name: ""
      });
      alert("New wallet: " + name);
    });
  };

  timerWL: any = null;

  componentDidMount() {
    this.addWallet = this.addWallet.bind(this);
    this.setName = this.setName.bind(this);
    this.showSetName = this.showSetName.bind(this);
    // @ts-ignore
    let _eventBus = window.eventBus;
    _eventBus.on("backbutton", this.backKeyClick);

    let self = this;
    getBiot(async (biot: any) => {
      async function updWL() {
        let wallets: any = [];
        let walletsInDb = await biot.core.getWallets();
        let lWN = localStorage.getItem("assocWalletToName");
        let assocWalletToName = lWN ? JSON.parse(lWN) : {};
        for (let i = 0; i < walletsInDb.length; i++) {
          let wallet = walletsInDb[i];
          let balance = await biot.core.getWalletBalance(wallet);
          console.error("name", assocWalletToName[wallet], wallet);
          wallets = [
            ...wallets,
            {
              id: wallet,
              name: assocWalletToName[wallet]
                ? assocWalletToName[wallet]
                : wallet.substr(0, 25) + "...",
              coin: "Byteball",
              balance: balance.base.stable + balance.base.pending
            }
          ];
        }
        self.setState({ wallets: wallets });
      }

      await updWL();
      this.timerWL = setInterval(updWL, 10000);
    });
  }

  componentWillUnmount() {
    if (this.timerWL) clearInterval(this.timerWL);
    // @ts-ignore
    let _eventBus = window.eventBus;
    _eventBus.removeListener("backbutton", this.backKeyClick);
  }

  showWallets = () => {
    return this.state.wallets.map((wallets: IWallet) => {
      return (
        <div
          onClick={() => {
            this.props.setPage("wallet", wallets.id);
          }}
          key={wallets.id}
          className={"wallets-list-body"}
        >
          <div>
            <div className={"wallets-list-body-name"}>{wallets.name}</div>
            <div className={"wallets-list-body-balance"}>
              <span>{wallets.balance}</span> BC
            </div>
          </div>
          <div className="icon-arrow" />
        </div>
      );
    });
  };

  showSetName() {
    this.setState({ page: "setName" });
  }

  hideSetName() {
    this.setState({ page: "wallets" });
  }

  setName = evt => {
    this.setState({
      name: evt.target.value
    });
  };

  backKeyClick = () => {
    if (this.state.page === "setName") {
      this.hideSetName();
    }
  };

  render() {
    if (this.state.page === "setName") {
      return (
        <div>
          {/* <div className={"top-bar"}>
            <text className={"wallet-title"}>Create new wallet</text>
            <a onClick={() => this.hideSetName()} className={"back-button"}>
              {" "}
            </a>
		  </div> */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
              fontSize: "21px"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#ffffff"
              }}
            >
              <div
                onClick={() => this.hideSetName()}
                className="topmenu_action"
              >
                <div className="topmenu_action-arrow" />
              </div>
              <div style={{ paddingLeft: 20, width: "100%" }}>
                Create new wallet
              </div>
            </div>
            <div className="line" />
          </div>
          {/* textAlign: "center", marginTop: "4em" */}
          <div className={"app-body"} style={{ marginTop: "6em" }}>
            <div className="inner">
              <div>
                <input
                  type={"text"}
                  className={"name-input"}
                  placeholder={"Wallet name"}
                  onChange={this.setName}
                />
              </div>
              <div className={"button-block"}>
                <button
                  onClick={() => this.addWallet()}
                  className={"button-send-submit"}
                  type="submit"
                >
                  Create wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div>
          {/* <div className={"wallets-list"}>
            <text className={"wallets-list-text"}>Your wallets</text>
            <a className={"add-wallet-button"} onClick={this.showSetName} />
          </div> */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
              fontSize: "21px"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingLeft: 20
              }}
            >
              <div>Your wallets</div>
              <div onClick={this.showSetName} className="topmenu_action">
                <div className="topmenu_action-img" />
              </div>
            </div>
            <div className="line" />
          </div>
          <div id={"bl_for_scroll_wallets"}>
            <div className={"state-wallets"}>{this.showWallets()}</div>
          </div>
        </div>
      );
    }
  }
}

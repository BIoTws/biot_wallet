import * as React from "react";

interface IPage {
	page: string;
}

export class Menu extends React.Component<any, IPage> {
	constructor(props: any) {
		super(props);
	}

	setP(name) {
		this.props.setPage(name);
	}
	render() {
		return (
			<div className="menu">
				<a
					onClick={() => {
						this.setP("wallet");
					}}
					className="menu__item"
				>
					<div
						className={
							this.props.page === "wallet" ? "index-icon-active" : "index-icon"
						}
					/>
					<div
						className={
							this.props.page === "wallet" ? "menu__title_active" : "menu__title"
						}
					>
						Wallet
          </div>
				</a>

				<a
					onClick={() => {
						this.setP("qrScanner");
					}}
					className="menu__item"
				>
					<div className="qr-scanner" />
					<div className="menu__title">Scan</div>
				</a>

				<a
					onClick={() => {
						this.setP("apps");
					}}
					className="menu__item"
				>
					<div
						className={
							this.props.page === "apps" ? "app-icon-active" : "app-icon"
						}
					/>
					<div
						className={
							this.props.page === "apps" ? "menu__title_active" : "menu__title"
						}
					>
						Apps & Chats
          </div>
				</a>
			</div>
		);
	}
}

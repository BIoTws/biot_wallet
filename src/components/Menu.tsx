import * as React from "react";

interface IPage {
	page: string;
}

export class Menu extends React.Component<any, IPage> {

	constructor (props: any) {
		super(props);
	}

	setP (name) {
		this.props.setPage(name);
	}

	render () {
		return (
			<div className={'menu'}>
				<a onClick={() => {
					this.setP("index")
				}} className={this.props.page === 'index' ? 'index-icon-active' :'index-icon'}>
				</a>
				<a onClick={() => {
					this.setP("qrScanner")
				}} className={'qr-scanner'}>
				</a>
				<a onClick={() => {
					this.setP("apps")
				}} className={this.props.page === 'apps' ? 'app-icon-active' :'app-icon'}>
				</a>
			</div>
		)
	}
}
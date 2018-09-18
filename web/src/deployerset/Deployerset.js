import React, {Component} from 'react';
import './Deployerset.css';

// or
import { Button } from 'react-bootstrap';

class Deployerset extends Component {
    render() {
        return (
            <div className="DeployerSetContainer">
                <div>
                    Dev
                </div>
                <div className="DeployerSetScrollContainer">
                    <table>
                        <tbody>
                        <tr>
                            <td><i className="fa fa-cloud" aria-hidden="true" title="Infrastructure"></i></td>
                            <td><div className="deployment-name">aws-infrastructure</div></td>
                            <td><div className="deployment-version">0.1.110</div></td>
                        </tr>
                        <tr>
                            <td><i className="fa fa-cloud-upload" aria-hidden="true" title="Kubernetes deploy"></i></td>
                            <td><div className="deployment-name">www_icelandair_com</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        <tr>
                            <td><i className="fa fa-database" aria-hidden="true" title="Last deployment run"></i></td>
                            <td><div className="deployment-name" title="www_icelandair_com_really_long_name">www_icelandair_com_really_long_name</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        <tr>
                            <td><i className="fa fa-gear" aria-hidden="true" title="Deployer"></i></td>
                            <td><div className="deployment-name">lambda deployer</div></td>
                            <td><div className="deployment-version">12.2.110</div></td>
                        </tr>
                        <tr>

                            <td></td>
                            <td><div className="deployment-name">www_icelandair_com</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td><div className="deployment-name">www_icelandair_com</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td><div className="deployment-name">www_icelandair_com</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td><div className="deployment-name">www_icelandair_com</div></td>
                            <td><div className="deployment-version">1.1.110</div></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
                <div  className="deployment-set-footer">
                    <Button bsStyle="primary">Promote</Button>
                    <div className="deployment-set-links">

                        <a href="http://somewhere.else">Changes </a>
                        <a href="http://somewhere.else">Health </a>
                        <a href="http://somewhere.else">Sources </a>
                        <a href="http://somewhere.else">Secrets </a>
                        <a href="http://somewhere.else">Config </a>
                    </div>
                </div>
            </div>
        );
    }
}

export default Deployerset;

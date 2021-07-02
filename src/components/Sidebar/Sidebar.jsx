import React, { useCallback, useState, useEffect } from 'react';
import { NavLink } from "react-router-dom";
import Social from "../Social";
import OlympusLogo from '../../assets/logo.svg';
import externalUrls from './externalUrls';
import { ReactComponent as StakeIcon } from "../../assets/icons/stake-icon.svg";
import { ReactComponent as BondIcon } from "../../assets/icons/bond-icon.svg";
import { ReactComponent as DashboardIcon } from "../../assets/icons/dashboard-icon.svg";
import { trim } from "../../helpers";
import "./sidebar.scss";
import useBonds from "../../hooks/Bonds";
import { Paper, Drawer, Link, Button } from "@material-ui/core";

function Sidebar({ isExpanded, theme, currentIndex }) {
  const [isActive] = useState();
  const bonds = useBonds();

  const checkPage = useCallback((match, location, page) => {
    const currentPath = location.pathname.replace("/", "");
    if (currentPath.indexOf("dashboard") >= 0 && page === "dashboard") {
      return true;
    }
    if (currentPath.indexOf("stake") >= 0 && page === "stake") {
      return true;
    }
    if ((currentPath.indexOf("bonds") >= 0 || currentPath.indexOf("choose_bond") >= 0) && page === "bonds") {
      return true;
    }
    return false;
  }, []);

  return (
    <div
      className={`${isExpanded ? 'show' : '' } d-lg-block sidebar collapse`}
      id="sidebarContent"
    >
      <Drawer variant="permanent" anchor="left">
        <Paper className="dapp-sidebar">
          <div className="dapp-menu-top">
            <div className="branding-header">
              <a href="https://olympusdao.finance" target="_blank">
                <img className="branding-header-icon" src={OlympusLogo} alt="OlympusDAO" />
                <h3>Olympus</h3>
              </a>
            </div>
          
            <div className="dapp-menu-links">
              <div className="dapp-nav" id="navbarNav">
                <NavLink id="dash-nav" to="/dashboard" isActive={(match, location) => { return checkPage(match, location, "dashboard") }} className={`button-dapp-menu ${isActive ? "active" : ""}`}>
                  <DashboardIcon className="me-3" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink id="stake-nav" to="/" isActive={(match, location) => { return checkPage(match, location, "stake") }}  className={`button-dapp-menu ${isActive ? "active" : ""}`} >
                  <StakeIcon className="me-3" />
                  <span>Stake</span>
                </NavLink>

                <NavLink id="bond-nav" to="/bonds" isActive={(match, location) => { return checkPage(match, location, "bonds") }} className={`button-dapp-menu ${isActive ? "active" : ""}`}>
                  <BondIcon className="me-3" />
                  <span>Bond</span>
                </NavLink>

                <div className="dapp-menu-data discounts">
                  <div className="bond-discounts">
                    <p>Bond discounts</p>
                    {bonds.map((bond, i) => (
                      <Link component={NavLink} to={`/bonds/${bond.value}`} key={i} className={"bond"}>{bond.name}<span>{bond.discount ? trim(bond.discount * 100, 2) : ''}%</span></Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr />

          <div className="dapp-menu-data bottom">
            <div className="dapp-menu-external-links">
              { Object.keys(externalUrls).map((link, i) => {
                return <a key={i} href={`${externalUrls[link].url}`} target="_blank" className="button button-dapp-menu">
                  <span className="bond-pair-name">{externalUrls[link].icon}</span>
                  <span className="bond-pair-roi">{externalUrls[link].title}</span>
                </a>
                }
              )}
            </div>
          </div>

          {theme === "girth" &&
            <div className="data-ohm-index">
              <p>Current Index </p>
              <p>{trim(currentIndex, 4)} OHM</p>
            </div>
          }
          <div className="dapp-menu-social">
            <Social />
          </div>
          
        </Paper>
      </Drawer>
    </div>
  );
}

export default Sidebar;

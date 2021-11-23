import { BigNumber, BigNumberish, ethers } from "ethers";
import { addresses } from "../constants";
import { abi as ierc20Abi } from "../abi/IERC20.json";
import { abi as sOHMv2 } from "../abi/sOhmv2.json";
import { abi as fuseProxy } from "../abi/FuseProxy.json";
import { abi as wsOHM } from "../abi/wsOHM.json";

import { setAll } from "../helpers";

import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/store";
import { IBaseAddressAsyncThunk, ICalcUserBondDetailsAsyncThunk } from "./interfaces";
import { FuseProxy, IERC20, IERC20__factory, SOhmv2, SOhmv2__factory, WsOHM } from "src/typechain";
import { GOHM__factory } from "src/typechain/factories/GOHM__factory";

interface IUserBalances {
  balances: {
    gohm: string;
    ohm: string;
    sohm: string;
    fsohm: string;
    wsohm: string;
    wsohmAsSohm: string;
    pool: string;
  };
}

export const getBalances = createAsyncThunk(
  "account/getBalances",
  async ({ address, networkID, provider }: IBaseAddressAsyncThunk) => {
    const gOhmContract = GOHM__factory.connect(addresses[networkID].GOHM_ADDRESS, provider);
    const gOhmBalance = await gOhmContract.balanceOf(address);
    const ohmContract = new ethers.Contract(addresses[networkID].OHM_ADDRESS as string, ierc20Abi, provider) as IERC20;
    const ohmBalance = await ohmContract.balanceOf(address);
    const sohmContract = new ethers.Contract(
      addresses[networkID].SOHM_ADDRESS as string,
      ierc20Abi,
      provider,
    ) as IERC20;
    const sohmBalance = await sohmContract.balanceOf(address);
    const wsohmContract = new ethers.Contract(addresses[networkID].WSOHM_ADDRESS as string, wsOHM, provider) as WsOHM;
    const wsohmBalance = await wsohmContract.balanceOf(address);
    // NOTE (appleseed): wsohmAsSohm is wsOHM given as a quantity of sOHM
    const wsohmAsSohm = await wsohmContract.wOHMTosOHM(wsohmBalance);
    const poolTokenContract = new ethers.Contract(
      addresses[networkID].PT_TOKEN_ADDRESS as string,
      ierc20Abi,
      provider,
    ) as IERC20;
    const poolBalance = await poolTokenContract.balanceOf(address);

    let fsohmBalance = BigNumber.from(0);
    for (const fuseAddressKey of ["FUSE_6_SOHM", "FUSE_18_SOHM", "FUSE_36_SOHM"]) {
      if (addresses[networkID][fuseAddressKey]) {
        const fsohmContract = new ethers.Contract(
          addresses[networkID][fuseAddressKey] as string,
          fuseProxy,
          provider.getSigner(),
        ) as FuseProxy;
        // fsohmContract.signer;
        const balanceOfUnderlying = await fsohmContract.callStatic.balanceOfUnderlying(address);
        fsohmBalance = balanceOfUnderlying.add(fsohmBalance);
      }
    }

    return {
      balances: {
        gohm: ethers.utils.formatEther(gOhmBalance),
        ohm: ethers.utils.formatUnits(ohmBalance, "gwei"),
        sohm: ethers.utils.formatUnits(sohmBalance, "gwei"),
        fsohm: ethers.utils.formatUnits(fsohmBalance, "gwei"),
        wsohm: ethers.utils.formatEther(wsohmBalance),
        wsohmAsSohm: ethers.utils.formatUnits(wsohmAsSohm, "gwei"),
        pool: ethers.utils.formatUnits(poolBalance, "gwei"),
      },
    };
  },
);

interface IUserAccountDetails {
  staking: {
    ohmStake: number;
    ohmUnstake: number;
  };
  wrapping: {
    sohmWrap: number;
    wsohmUnwrap: number;
    gOhmUnwrap: number;
  };
}

export const getMigrationAllowances = createAsyncThunk(
  "account/getMigrationAllowances",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    let ohmAllowance = BigNumber.from(0);
    let sOhmAllowance = BigNumber.from(0);
    let wsOhmAllowance = BigNumber.from(0);
    let gOhmAllowance = BigNumber.from(0);

    if (addresses[networkID].OHM_ADDRESS) {
      const ohmContract = IERC20__factory.connect(addresses[networkID].OHM_ADDRESS, provider);
      ohmAllowance = await ohmContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].SOHM_ADDRESS) {
      const sOhmContract = IERC20__factory.connect(addresses[networkID].SOHM_ADDRESS, provider);
      sOhmAllowance = await sOhmContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].WSOHM_ADDRESS) {
      const wsOhmContract = IERC20__factory.connect(addresses[networkID].WSOHM_ADDRESS, provider);
      wsOhmAllowance = await wsOhmContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].GOHM_ADDRESS) {
      const gOhmContract = IERC20__factory.connect(addresses[networkID].GOHM_ADDRESS, provider);
      gOhmAllowance = await gOhmContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    return {
      migration: {
        ohm: +ohmAllowance,
        sohm: +sOhmAllowance,
        wsohm: +wsOhmAllowance,
        gohm: +gOhmAllowance,
      },
      isMigrationComplete: false,
    };
  },
);

export const loadAccountDetails = createAsyncThunk(
  "account/loadAccountDetails",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    const gOhmContract = GOHM__factory.connect(addresses[networkID].GOHM_ADDRESS, provider);
    const gOhmUnwrapAllowance = await gOhmContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);

    const ohmContract = new ethers.Contract(addresses[networkID].OHM_ADDRESS as string, ierc20Abi, provider) as IERC20;
    const stakeAllowance = await ohmContract.allowance(address, addresses[networkID].STAKING_HELPER_ADDRESS);

    const sohmContract = new ethers.Contract(addresses[networkID].SOHM_ADDRESS as string, sOHMv2, provider) as SOhmv2;
    const unstakeAllowance = await sohmContract.allowance(address, addresses[networkID].STAKING_ADDRESS);
    const poolAllowance = await sohmContract.allowance(address, addresses[networkID].PT_PRIZE_POOL_ADDRESS);
    const wrapAllowance = await sohmContract.allowance(address, addresses[networkID].WSOHM_ADDRESS);

    const wsohmContract = new ethers.Contract(addresses[networkID].WSOHM_ADDRESS as string, wsOHM, provider) as WsOHM;
    const unwrapAllowance = await wsohmContract.allowance(address, addresses[networkID].WSOHM_ADDRESS);

    await dispatch(getBalances({ address, networkID, provider }));

    return {
      staking: {
        ohmStake: +stakeAllowance,
        ohmUnstake: +unstakeAllowance,
      },
      wrapping: {
        ohmWrap: +wrapAllowance,
        ohmUnwrap: +unwrapAllowance,
        gOhmUnwrap: +gOhmUnwrapAllowance,
      },
      pooling: {
        sohmPool: +poolAllowance,
      },
    };
  },
);

export interface IUserBondDetails {
  allowance: number;
  interestDue: number;
  bondMaturationBlock: number;
  pendingPayout: string; //Payout formatted in gwei.
}
export const calculateUserBondDetails = createAsyncThunk(
  "account/calculateUserBondDetails",
  async ({ address, bond, networkID, provider }: ICalcUserBondDetailsAsyncThunk) => {
    if (!address) {
      return {
        bond: "",
        displayName: "",
        bondIconSvg: "",
        isLP: false,
        allowance: 0,
        balance: "0",
        interestDue: 0,
        bondMaturationBlock: 0,
        pendingPayout: "",
      };
    }
    // dispatch(fetchBondInProgress());

    // Calculate bond details.
    const bondContract = bond.getContractForBond(networkID, provider);
    const reserveContract = bond.getContractForReserve(networkID, provider);

    let pendingPayout, bondMaturationBlock;

    const bondDetails = await bondContract.bondInfo(address);
    let interestDue: BigNumberish = Number(bondDetails.payout.toString()) / Math.pow(10, 9);
    bondMaturationBlock = +bondDetails.vesting + +bondDetails.lastBlock;
    pendingPayout = await bondContract.pendingPayoutFor(address);

    let allowance,
      balance = BigNumber.from(0);
    allowance = await reserveContract.allowance(address, bond.getAddressForBond(networkID));
    balance = await reserveContract.balanceOf(address);
    // formatEthers takes BigNumber => String
    const balanceVal = ethers.utils.formatEther(balance);
    // balanceVal should NOT be converted to a number. it loses decimal precision
    return {
      bond: bond.name,
      displayName: bond.displayName,
      bondIconSvg: bond.bondIconSvg,
      isLP: bond.isLP,
      allowance: Number(allowance.toString()),
      balance: balanceVal,
      interestDue,
      bondMaturationBlock,
      pendingPayout: ethers.utils.formatUnits(pendingPayout, "gwei"),
    };
  },
);

interface IAccountSlice extends IUserAccountDetails, IUserBalances {
  bonds: { [key: string]: IUserBondDetails };
  balances: {
    gohm: string;
    ohm: string;
    sohm: string;
    dai: string;
    oldsohm: string;
    fsohm: string;
    wsohm: string;
    wsohmAsSohm: string;
    pool: string;
  };
  loading: boolean;
  staking: {
    ohmStake: number;
    ohmUnstake: number;
  };
  migration: {
    ohm: number;
    sohm: number;
    wsohm: number;
    gohm: number;
  };
  pooling: {
    sohmPool: number;
  };
}

const initialState: IAccountSlice = {
  loading: false,
  bonds: {},
  balances: { gohm: "", ohm: "", sohm: "", dai: "", oldsohm: "", fsohm: "", wsohm: "", pool: "", wsohmAsSohm: "" },
  staking: { ohmStake: 0, ohmUnstake: 0 },
  wrapping: { sohmWrap: 0, wsohmUnwrap: 0, gOhmUnwrap: 0 },
  pooling: { sohmPool: 0 },
  migration: { ohm: 0, sohm: 0, wsohm: 0, gohm: 0 },
};

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    fetchAccountSuccess(state, action) {
      setAll(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadAccountDetails.pending, state => {
        state.loading = true;
      })
      .addCase(loadAccountDetails.fulfilled, (state, action) => {
        setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(loadAccountDetails.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(getBalances.pending, state => {
        state.loading = true;
      })
      .addCase(getBalances.fulfilled, (state, action) => {
        setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(getBalances.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(calculateUserBondDetails.pending, state => {
        state.loading = true;
      })
      .addCase(calculateUserBondDetails.fulfilled, (state, action) => {
        if (!action.payload) return;
        const bond = action.payload.bond;
        state.bonds[bond] = action.payload;
        state.loading = false;
      })
      .addCase(calculateUserBondDetails.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(getMigrationAllowances.fulfilled, (state, action) => {
        setAll(state, action.payload);
      })
      .addCase(getMigrationAllowances.rejected, (state, { error }) => {
        console.log(error);
      });
  },
});

export default accountSlice.reducer;

export const { fetchAccountSuccess } = accountSlice.actions;

const baseInfo = (state: RootState) => state.account;

export const getAccountState = createSelector(baseInfo, account => account);

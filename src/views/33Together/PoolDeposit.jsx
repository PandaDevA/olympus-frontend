import { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  useMediaQuery,
} from "@material-ui/core";
import ConnectButton from "../../components/ConnectButton.jsx";
import { useWeb3Context } from "../../hooks";
import { getTokenImage } from "src/helpers/index.js";
import { calculateOdds } from "../../helpers/33Together";
import { listenAndHandleRNGCompleteEvent, listenAndHandleDepositEvent } from "../../helpers/33Together.js";
import { isPendingTxn, txnButtonText } from "../../slices/PendingTxnsSlice";
import { poolDeposit, changeApproval } from "../../slices/PoolThunk";
import { Skeleton } from "@material-ui/lab";

const sohmImg = getTokenImage("sohm");

export const PoolDeposit = props => {
  const dispatch = useDispatch();
  const { provider, address, chainID } = useWeb3Context();
  const [quantity, setQuantity] = useState(0);
  const [newOdds, setNewOdds] = useState(0);
  const [rngCompleted, setRngCompleted] = useState(false);
  const isAppLoading = useSelector(state => state.app.loading);
  const isMobileScreen = useMediaQuery("(max-width: 513px)");

  const sohmBalance = useSelector(state => {
    return state.account.balances && state.account.balances.sohm;
  });

  const poolBalance = useSelector(state => {
    return state.account.balances && parseFloat(state.account.balances.pool);
  });

  const poolAllowance = useSelector(state => {
    return state.account.pooling && state.account.pooling.sohmPool;
  });

  const pendingTransactions = useSelector(state => {
    return state.pendingTransactions;
  });

  const poolIsLocked = useSelector(state => {
    return state.app.pool && state.app.pool.isRngRequested;
  });

  const onSeekApproval = async token => {
    await dispatch(changeApproval({ address, token, provider, networkID: chainID }));
  };

  const onDeposit = async action => {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(quantity) || quantity === 0 || quantity === "") {
      // eslint-disable-next-line no-alert
      alert("Please enter a value!");
    } else {
      await dispatch(poolDeposit({ address, action, value: quantity.toString(), provider, networkID: chainID }));
    }
  };

  const hasAllowance = useCallback(() => {
    return poolAllowance > 0;
  }, [poolAllowance]);

  const setMax = () => {
    setQuantity(sohmBalance);
  };

  const updateDepositQuantity = e => {
    const value = parseFloat(e.target.value);
    setQuantity(value);
    let userBalanceAfterDeposit = poolBalance + value;

    let userOdds = calculateOdds(userBalanceAfterDeposit, props.totalPoolDeposits + value, props.winners);
    setNewOdds(userOdds);
  };

  // TODO (appleseed): fire one event here & one when timer is 0.
  useEffect(() => {
    console.log("locked", poolIsLocked);
    if (poolIsLocked) {
      listenAndHandleRNGCompleteEvent(provider, chainID, () => {
        setRngCompleted(true);
      });
    }
  }, [poolIsLocked]);

  if (poolIsLocked) {
    return (
      <Box display="flex" alignItems="center" className="pool-deposit-ui" flexDirection="column">
        {/*<img src={Warning} className="w-10 sm:w-14 mx-auto mb-4" />*/}
        <Typography variant="h6">This Prize Pool is unable to accept deposits at this time.</Typography>
        <Typography variant="body1" style={{ marginTop: "0.5rem" }}>
          Deposits can be made once the prize has been awarded.
        </Typography>
        <Typography variant="body1" style={{ marginTop: "0.5rem" }}>
          Check back soon!
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" className="pool-deposit-ui">
      {!address ? (
        <ConnectButton />
      ) : (
        <Box>
          <Box display="flex" alignItems="center" flexDirection={`${isMobileScreen ? "column" : "row"}`}>
            <FormControl className="ohm-input" variant="outlined" color="primary">
              <InputLabel htmlFor="amount-input"></InputLabel>
              <OutlinedInput
                id="amount-input"
                type="number"
                placeholder="Enter an amount"
                className="pool-input"
                value={quantity}
                onChange={e => updateDepositQuantity(e)}
                startAdornment={
                  <InputAdornment position="start">
                    <div className="logo-holder">{sohmImg}</div>
                  </InputAdornment>
                }
                labelWidth={0}
                endAdornment={
                  <InputAdornment position="end">
                    <Button variant="text" onClick={setMax}>
                      Max
                    </Button>
                  </InputAdornment>
                }
              />
            </FormControl>

            {address && hasAllowance("sohm") ? (
              <Button
                className="pool-deposit-button"
                variant="contained"
                color="primary"
                disabled={isPendingTxn(pendingTransactions, "pool_deposit")}
                onClick={() => onDeposit("deposit")}
                fullWidth
              >
                {txnButtonText(pendingTransactions, "deposit", "Deposit sOHM")}
              </Button>
            ) : (
              <Button
                className="pool-deposit-button"
                variant="contained"
                color="primary"
                disabled={isPendingTxn(pendingTransactions, "pool_deposit")}
                onClick={() => onSeekApproval("sohm")}
              >
                {txnButtonText(pendingTransactions, "approve_pool", "Approve")}
              </Button>
            )}
          </Box>
          {newOdds > 0 && quantity > 0 && (
            <Box margin={2}>
              <Typography color="error">
                After depositing {quantity} sOHM your odds of winning would be 1 in {newOdds}.&nbsp;
              </Typography>
            </Box>
          )}
          <Box margin={2}>
            <Typography variant="body2">
              Deposit sOHM to win! Once deposited, you will receive a corresponding amount of 33T and be entered to win
              until your sOHM is withdrawn.
            </Typography>
          </Box>

          {/* NOTE (Appleseed): added this bc I kept losing track of which accounts I had sOHM in during testing */}
          <div className={`stake-user-data`}>
            <div className="data-row">
              <Typography variant="body1">Your Staked Balance (Depositable)</Typography>
              <Typography variant="body1">
                {isAppLoading ? (
                  <Skeleton width="80px" />
                ) : (
                  <>{new Intl.NumberFormat("en-US").format(sohmBalance)} sOHM</>
                )}
              </Typography>
            </div>
          </div>
        </Box>
      )}
    </Box>
  );
};

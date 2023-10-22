import { Schema, model, connect } from "mongoose";

interface ITransaction {
  nonce: string;
  sender: string;
  recipient: string;
  amount: string;
  initChainId?: number;
  destChainId?: number;
  nonceUsed?: boolean;
}

const transactionSchema = new Schema<ITransaction>({
  nonce: {
    type: String,
    required: true,
    minlength: 0,
    unique: true,
  },
  sender: {
    type: String,
    required: true,
    min: 0,
  },
  recipient: {
    type: String,
    required: true,
    min: 0,
  },
  amount: {
    type: String,
    required: true,
    min: 0,
  },
  initChainId: {
    type: Number,
    required: true,
    min: 0,
  },
  destChainId: {
    type: Number,
    required: true,
    min: 0,
  },
  nonceUsed: {
    type: Boolean,
    required: true,
    default: false,
  },
});

export const Transaction = model<ITransaction>(
  "Transaction",
  transactionSchema
);

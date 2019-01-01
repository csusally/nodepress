/**
 * Helper Akismet service.
 * @file Helper Akismet 评论反垃圾服务
 * @module processors/helper/akismet.service
 * @author Surmon <https://github.com/surmon-china>
 */

import * as akismet from 'akismet-api';
import * as APP_CONFIG from '@app/app.config';
import { Injectable } from '@nestjs/common';

export interface TContent {
  user_ip: string;
  user_agent: string;
  referrer: string;
  comment_type?: 'comment';
  comment_author?: string;
  comment_author_email?: string;
  comment_author_url?: string;
  comment_content?: string;
  is_test?: boolean;
}

export enum EAkismetActionTypes {
  CheckSpam = 'checkSpam',
  SubmitSpam = 'submitSpam',
  SubmitHam = 'submitHam',
}

@Injectable()
export class AkismetService {

  private client: akismet;
  private clientIsValid: boolean;

  constructor() {
    this.client = akismet.client({
      key: APP_CONFIG.AKISMET.key,
      blog: APP_CONFIG.AKISMET.blog,
    });
    this.initVerify();
  }

  // 检查 SPAM
  public checkSpam(content: TContent): Promise<any> {
    return this.buildAkismetInterceptor(EAkismetActionTypes.CheckSpam)(content);
  }

  // 提交 SPAM
  public submitSpam(content: TContent): Promise<any> {
    return this.buildAkismetInterceptor(EAkismetActionTypes.SubmitSpam)(content);
  }

  // 提交 HAM
  public submitHam(content: TContent): Promise<any> {
    return this.buildAkismetInterceptor(EAkismetActionTypes.SubmitHam)(content);
  }

  // 初始化验证
  private initVerify(): void {
    this.verifyKey().then(_ => {
      this.clientIsValid = true;
      console.info(`Akismet key 有效，已准备好工作!`);
    }).catch(error => {
      this.clientIsValid = false;
      console.warn('Akismet 初始化连接失败，无法工作!', error);
    });
  }

  // 验证有效性
  private verifyKey(): Promise<boolean> {
    return this.client.verifyKey().then(valid => {
      return valid
        ? Promise.resolve(true)
        : Promise.reject(`Akismet key 无效`);
    }).catch(error => Promise.reject(error.message));
  }

  // 构造检查器
  private buildAkismetInterceptor(handleType: EAkismetActionTypes) {
    return (content: TContent): Promise<any> => {
      return new Promise((resolve, reject) => {
        this.verifyKey().then(_ => {
          console.info(`Akismet ${handleType} 操作中...`, new Date());
          this.client[handleType](content).then(result => {
            // 如果是检查 spam 且检查结果为 true
            if (handleType === EAkismetActionTypes.CheckSpam && result) {
              console.warn('Akismet ${handleType} 操作失败!', new Date());
              reject(new Error('spam!'));
            } else {
              console.info(`Akismet ${handleType} 操作成功!`);
              resolve(result);
            }
          }).catch(error => {
            const message = `Akismet ${handleType} 操作失败!`;
            console.warn(message, error);
            reject(message);
          });
        }).catch(_ => {
          const message = 'Akismet 未初始化成功，放弃操作';
          console.warn(message);
          resolve(message);
        });
      });
    };
  }
}
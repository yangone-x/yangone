import type {
  AllowedComponentProps,
  ComponentCustomProps,
  ComponentObjectPropsOptions,
  ComponentOptions,
  ComponentPublicInstance,
  DefineSetupFnComponent,
  EmitsOptions,
  RenderFunction,
  SetupContext,
  SlotsType,
  VNodeProps,
} from 'vue';

type PublicProps = AllowedComponentProps & ComponentCustomProps & VNodeProps;

type EmitFnFromRecord<E> = <K extends Extract<keyof E, string>>(
  event: K,
  ...args: E[K] extends (...a: infer A) => any ? A : never
) => void;

type EmitsToPropsLoose<E> = {
  [K in Extract<keyof E, string> as `on${Capitalize<K>}`]?: (
    ...args: E[K] extends (...a: infer A) => any ? A : any[]
  ) => any;
};

interface WithTypedEmits<Props, E> {
  new (): ComponentPublicInstance & {
    $emit: EmitFnFromRecord<E>;
    $props: EmitsToPropsLoose<E> & Props & PublicProps;
  };
}

type SetupContextLoose<E, S extends SlotsType> = Omit<
  SetupContext<EmitsOptions, S>,
  'emit'
> & { emit: EmitFnFromRecord<E> };

declare module 'vue' {
  /**
   * - E 不要求 EmitsOptions（无需索引签名）
   * - 用 __typeEmits 把“真实事件类型”喂给 language-tools
   * - 返回仍保持 DefineSetupFnComponent<Props, EmitsOptions, S>，不破坏既有提示
   */
  export function defineComponent<
    Props extends Record<string, any>,
    E extends Record<string, any> = any,
    EE extends string = string,
    S extends SlotsType = any,
  >(
    setup: (
      props: Props,
      ctx: SetupContextLoose<E, S>,
    ) => Promise<RenderFunction> | RenderFunction,
    options?: {
      /**
       * @private for language-tools use only
       */
      __typeEmits?: E;
      __typeProps?: Props;
      emits?: EE[]; // runtime emits 用字符串数组就好
      props?: (keyof Props)[] | ComponentObjectPropsOptions<Props>;
      slots?: S;
    } & Pick<ComponentOptions, 'inheritAttrs' | 'name'>,
  ): DefineSetupFnComponent<Props, EmitsOptions, S> & WithTypedEmits<Props, E>;
}

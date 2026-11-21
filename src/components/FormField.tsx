import { Form, type FormItemProps } from 'antd';
import { cloneElement, type ReactElement, type Ref } from 'react';
import {
  Controller,
  useFormContext,
  type Control,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type ChildProps = {
  value?: unknown;
  checked?: unknown;
  onChange?: (...args: never[]) => void;
  onBlur?: (...args: never[]) => void;
  ref?: Ref<unknown>;
};

export type FormFieldProps<T extends FieldValues, N extends FieldPath<T>> = Omit<
  FormItemProps,
  'name' | 'rules' | 'children' | 'validateStatus'
> & {
  name: N;
  /** Bỏ trống thì lấy từ `FormProvider` bọc ngoài. */
  control?: Control<T>;
  /** Luật của react-hook-form. Luật không có câu báo (`required: true`) chỉ chặn nút gửi, không hiện chữ đỏ. */
  rules?: ControllerProps<T, N>['rules'];
  /** `checked` cho Checkbox / Switch, giống `valuePropName` của antd. */
  valuePropName?: 'value' | 'checked';
  /** Một ô nhập antd: FormField gắn `value`/`onChange`/`onBlur` vào, các prop khác của ô giữ nguyên. */
  children: ReactElement<ChildProps>;
};

function checkedOf(arg: unknown) {
  if (arg && typeof arg === 'object' && 'target' in arg) {
    return Boolean((arg as { target: { checked?: boolean } }).target.checked);
  }
  return arg;
}

/**
 * `Form.Item` của antd nhưng giá trị nằm trong react-hook-form.
 * antd chỉ còn lo dàn trang (nhãn, dấu *, chỗ hiện lỗi); `<Form>` bọc ngoài không cần `form`.
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  valuePropName = 'value',
  children,
  required,
  help,
  ...item
}: FormFieldProps<T, N>) {
  const context = useFormContext<T>() as ReturnType<typeof useFormContext<T>> | null;
  const formControl = control ?? context?.control;
  if (!formControl) {
    throw new Error(`FormField "${name}" cần prop control hoặc FormProvider.`);
  }
  const own = children.props;
  return (
    <Controller
      control={formControl}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => {
        const message = fieldState.error?.message;
        return (
          <Form.Item
            {...item}
            required={required ?? Boolean(rules?.required)}
            validateStatus={message ? 'error' : undefined}
            help={message || help}
          >
            {cloneElement(children, {
              [valuePropName]: field.value,
              onChange: (...args: never[]) => {
                field.onChange(valuePropName === 'checked' ? checkedOf(args[0]) : args[0]);
                own.onChange?.(...args);
              },
              onBlur: (...args: never[]) => {
                field.onBlur();
                own.onBlur?.(...args);
              },
              ref: field.ref,
            })}
          </Form.Item>
        );
      }}
    />
  );
}
